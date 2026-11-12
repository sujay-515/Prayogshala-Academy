import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { parseRawMCQText, findDuplicateQuestion, validateExtractedQuestion } from './src/utils/mcqParser';
import { extractTextFromPdfBuffer } from './src/utils/pdfTextExtractor';
import { calculateExamScore, normalizeAnswer, DEFAULT_PENALTY_PER_WRONG } from './src/utils/scoring';
import { getGrandTestWindow, getLeaderboardWindowStart, formatNepalTime } from './src/utils/examWindow';
import { isSafeImageUrl } from './src/utils/urlSecurity';
import { normalizeExamCategories, questionMatchesExamCategory } from './src/utils/examCategories';
import { ExtractedMCQDraft, MCQQuestion, QuestionReport, toPublicQuestion, toGradedExamQuestion, ALLOWED_QUESTION_STATUSES, QuestionStatus } from './src/types';
import { resolveTrustProxy } from './src/server/trustProxy';
import { getRateLimitKey, minimizeIp, minimizeUserAgent } from './src/server/rateLimit';
import { prepareExamQuestions, createMulberry32, seededShuffle, shuffleQuestionOptions } from './src/server/examAssembly';
import {
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_TOTAL_QUESTIONS,
} from './src/config/ceeUg';
import {
  db,
  hashPassword,
  verifyPassword,
  DEFAULT_USER_STATS,
  getAllQuestions,
  getQuestionById,
  queryQuestions,
  upsertQuestion,
  bulkInsertQuestions,
  deleteQuestionById,
  bulkDeleteQuestions,
  bulkUpdateQuestionStatus,
  getAllCategories,
  saveAllCategories,
  getAllReports,
  insertReport,
  updateReportStatus,
  getUserStats,
  saveUserStats,
  purgeStaffStudyData,
  saveSourcePdf,
  getSourcePdf,
  listSourcePdfs,
  saveStagingDrafts,
  getLatestStagingDrafts,
  clearStagingDrafts,
  cleanupExpiredData,
  hydrateFromSupabase,
  getUserByEmailOrUsername,
  getUserByGoogleSub,
  getUserByEmail,
  listAllUsers,
  updateUserRole,
  createPasswordReset,
  verifyAndConsumeResetToken,
  hashToken,
  createEmailVerification,
  verifyEmailToken,
  restoreBackup,
  cleanupCeeUgTaxonomy,
} from './src/server/db';
import { bootstrapSuperAdmin } from './src/server/bootstrap';
import {
  isSupabaseConfigured,
  pingSupabaseKeepAlive,
  syncUpsertUser,
  syncPatchUser,
  syncUpdateUserRole,
  syncDeleteUser,
  syncInsertSession,
  syncDeleteSession,
  syncDeleteUserSessions,
  syncDeleteUserPasswordResets,
  syncInsertActiveExam,
  syncDeleteActiveExam,
  syncInsertExamAttempt,
  syncUpsertWeeklyPaper,
  syncUpsertMockSetConfig,
  syncDeleteMockSetConfig,
} from './src/server/supabaseSync';
import {
  sendWelcomeEmail,
  sendStaffInviteEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './src/server/emailService';
import { startBackupScheduler, stopBackupScheduler } from './src/server/backup';
import {
  FREE_MOCK_EXAMS,
  FREE_PRACTICE_PER_UNIT,
  activateSubscription,
  consumeMockStart,
  consumePracticeAnswer,
  createPayment,
  findPaymentByGatewayRef,
  getActiveSubscription,
  getMockQuota,
  getPayment,
  getPlan,
  getPlanAny,
  getPracticeQuota,
  grantSubscription,
  hasFullAccess,
  listPlans,
  listPracticeUsage,
  listSubscriptionsForAdmin,
  revokeSubscription,
  updatePayment,
  usageKeyFor,
} from './src/server/billing';
import {
  buildEsewaCheckout,
  checkEsewaStatus,
  createKhaltiCheckout,
  decodeEsewaCallback,
  isEsewaConfigured,
  isKhaltiConfigured,
  verifyEsewaCallbackSignature,
  verifyKhaltiPayment,
} from './src/server/payments';
import { verifyGoogleIdToken } from './src/server/googleAuth';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// 1. Reverse proxy configuration & security headers
const trustProxySetting = resolveTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV);
if (trustProxySetting !== false) {
  app.set('trust proxy', trustProxySetting);
}
app.disable('x-powered-by');

// Security headers via Helmet (Production only; skipped in development)
if (process.env.NODE_ENV !== 'development') {
  if (process.env.NODE_ENV === 'production' && !process.env.CSP_MODE) {
    console.warn('[Security Warning] CSP_MODE is unset; defaulting Content-Security-Policy to report-only mode.');
  }
  const isEnforceCsp = process.env.CSP_MODE?.trim().toLowerCase() === 'enforce';
  app.use(
    helmet({
      contentSecurityPolicy: {
        reportOnly: !isEnforceCsp,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          frameSrc: ["'self'", 'data:', 'blob:', 'https://accounts.google.com/gsi/'],
          connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
          scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
          upgradeInsecureRequests: null,
        },
      },
    })
  );

  // SEO: Send X-Robots-Tag: noindex header for non-public paths (/api/*, /admin*, /dashboard*)
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/admin') ||
      req.path.startsWith('/dashboard')
    ) {
      res.setHeader('X-Robots-Tag', 'noindex');
    }
    next();
  });
}

// 2. Rate Limiting Middleware (using express-rate-limit)
const createLimiter = (windowMs: number, max: number, message: string, skipSuccessful = false) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => getRateLimitKey(req, getSessionUser),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: message });
    },
  });

const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many failed login attempts. Please wait a few minutes before retrying.',
  true
);

const rawRegisterMax = process.env.RATE_LIMIT_REGISTER_MAX;
const registerMax = rawRegisterMax ? parseInt(rawRegisterMax, 10) : 20;
const registerLimiter = createLimiter(
  60 * 60 * 1000,
  isNaN(registerMax) ? 20 : registerMax,
  'Too many accounts created from this IP. Please try again later.'
);

const forgotPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many password reset requests. Please wait a few minutes before requesting another.'
);

const resetPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many password reset attempts. Please wait before trying again.'
);

const emailVerificationLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many email verification requests. Please wait before trying again.'
);

const rawEmailVerificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED;
const emailVerificationRequired =
  rawEmailVerificationRequired !== undefined
    ? rawEmailVerificationRequired.toLowerCase() === 'true' || rawEmailVerificationRequired === '1'
    : Boolean(process.env.RESEND_API_KEY?.trim());

const changePasswordLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many password change attempts. Please wait before trying again.'
);

const reportQuestionLimiter = createLimiter(
  15 * 60 * 1000,
  15,
  'Too many question reports submitted. Please wait a few minutes before submitting more.'
);

const accountExportLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many account data export requests. Please wait before retrying.'
);

const accountDeleteLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many account deletion attempts. Please wait before retrying.'
);

const billingCheckoutLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  'Too many checkout attempts. Please wait before trying again.'
);

// Cloud vision & OCR client initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ACTIVE_SESSIONS = 5;

// Helper to resolve session from Authorization header (with 7-day TTL expiration check)
function getSessionUser(req: express.Request): { userId: string; role: string; username: string; email?: string; displayName: string; emailVerified: boolean } | null {
  if ((req as any)._sessionUser !== undefined) {
    return (req as any)._sessionUser;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any)._sessionUser = null;
    return null;
  }
  const rawToken = authHeader.slice(7);
  const tokenHash = hashToken(rawToken);
  const row = db
    .prepare(
      `SELECT s.user_id, u.role, s.created_at, u.username, u.email, u.display_name, u.email_verified
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(tokenHash) as any;
  if (!row) {
    (req as any)._sessionUser = null;
    return null;
  }

  if (row.created_at && Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(tokenHash);
    syncDeleteSession(tokenHash);
    (req as any)._sessionUser = null;
    return null;
  }

  const user = {
    userId: row.user_id,
    role: row.role,
    username: row.username,
    email: row.email || undefined,
    emailVerified: !emailVerificationRequired || row.email_verified !== 0,
    displayName: row.display_name,
  };
  (req as any)._sessionUser = user;
  return user;
}

// Rate limiters for question answer checking (Practice, Daily Question, Browse reveal)
const answerCheckHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req) => {
    const session = getSessionUser(req);
    const userMax = parseInt(process.env.ANSWER_CHECK_USER_PER_HOUR || '300', 10);
    const guestMax = parseInt(process.env.ANSWER_CHECK_GUEST_PER_HOUR || '60', 10);
    return session ? (isNaN(userMax) ? 300 : userMax) : (isNaN(guestMax) ? 60 : guestMax);
  },
  keyGenerator: (req) => getRateLimitKey(req, getSessionUser),
  skip: (req) => {
    const session = getSessionUser(req);
    return session?.role === 'admin' || session?.role === 'superadmin';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Hourly answer check limit reached. Please wait or sign in to continue.',
    });
  },
});

const answerCheckDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: (req) => {
    const session = getSessionUser(req);
    const userMax = parseInt(process.env.ANSWER_CHECK_USER_PER_DAY || '1500', 10);
    const guestMax = parseInt(process.env.ANSWER_CHECK_GUEST_PER_DAY || '200', 10);
    return session ? (isNaN(userMax) ? 1500 : userMax) : (isNaN(guestMax) ? 200 : guestMax);
  },
  keyGenerator: (req) => getRateLimitKey(req, getSessionUser),
  skip: (req) => {
    const session = getSessionUser(req);
    return session?.role === 'admin' || session?.role === 'superadmin';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Daily answer check limit reached. Please try again tomorrow or sign in.',
    });
  },
});

const examStartLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (_req) => {
    const raw = process.env.EXAM_START_PER_HOUR;
    const parsed = raw ? parseInt(raw, 10) : 10;
    return isNaN(parsed) ? 10 : parsed;
  },
  keyGenerator: (req) => getRateLimitKey(req, getSessionUser),
  skip: (req) => {
    const session = getSessionUser(req);
    return session?.role === 'admin' || session?.role === 'superadmin';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many exam sessions started this hour. Please wait before starting another exam.',
    });
  },
});

const extractPdfLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (_req) => {
    const raw = process.env.EXTRACT_PDF_PER_HOUR;
    const parsed = raw ? parseInt(raw, 10) : 20;
    return isNaN(parsed) ? 20 : parsed;
  },
  keyGenerator: (req) => getRateLimitKey(req, getSessionUser),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'PDF extraction limit reached (20 requests per hour). Please wait before processing more documents.',
    });
  },
});

// Rate limiter for PUT /api/stats (120 requests per 10 minutes per user)
const statsPutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: (_req) => {
    const raw = process.env.STATS_PUT_PER_10_MIN;
    const parsed = raw ? parseInt(raw, 10) : 120;
    return isNaN(parsed) ? 120 : parsed;
  },
  keyGenerator: (req) => getRateLimitKey(req, getSessionUser),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many statistics save requests. Please slow down.',
    });
  },
});

// Middleware to enforce authentication
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required to save statistics.' });
  }
  return next();
}

// Middleware to enforce role-based administrator permissions on management endpoints
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (session.role !== 'admin' && session.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Administrator privileges required.' });
  }
  return next();
}

/**
 * Staff (admin/superadmin) accounts are operational accounts only. Candidate
 * study progress, bookmarks, analytics, and leaderboard attempts belong to
 * student accounts exclusively.
 */
function isStaffRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

// Middleware to enforce Head Administrator (Super Admin) permissions
function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (session.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Head Administrator access required.' });
  }
  return next();
}

// 3. Route-specific body parsers with early auth/role checks (ORDER MATTERS: registered BEFORE the global 100kb parser)
// Unauthenticated or unauthorized callers are rejected immediately before large bodies can be buffered.
app.post('/api/extract-pdf', requireAdmin, extractPdfLimiter, express.json({ limit: '50mb' }));
app.post('/api/backup/restore', requireSuperAdmin, express.json({ limit: '25mb' }));
app.post('/api/staging', requireAdmin, express.json({ limit: '25mb' }));
app.post('/api/questions/bulk-import', requireAdmin, express.json({ limit: '10mb' }));
app.post('/api/questions/bulk-upsert', requireAdmin, express.json({ limit: '10mb' }));
app.post('/api/questions', requireAdmin, express.json({ limit: '5mb' }));
app.put('/api/questions', requireAdmin, express.json({ limit: '5mb' }));
app.put(
  '/api/stats',
  requireAuth,
  statsPutLimiter,
  express.json({ limit: '1mb' }),
  (req, res) => {
    const session = getSessionUser(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Authentication required to save statistics.' });
    }

    // Candidate study progress is only valid for student accounts.
    if (isStaffRole(session.role)) {
      return res.status(403).json({
        success: false,
        error: 'Staff accounts do not have candidate study progress.',
      });
    }

    const { stats, ...rest } = req.body || {};
    if (Object.keys(rest).length > 0) {
      return res.status(400).json({ success: false, error: 'Unknown top-level fields in request body.' });
    }
    if (!stats) {
      return res.status(400).json({ success: false, error: 'stats object required' });
    }

    const validationError = validateUserStats(stats);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    saveUserStats(session.userId, stats);
    return res.json({ success: true, stats });
  }
);

// 4. Global body parsers for all standard endpoints (strictly capped at 100kb)
// Unauthenticated callers and standard routes retain the 100kb global limit.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health check (also triggers a background Supabase keep-alive ping to prevent 7-day free-tier pause)
app.get('/api/health', (req, res) => {
  if (isSupabaseConfigured()) {
    void pingSupabaseKeepAlive().catch((err) => console.warn('[KeepAlive Error]', err));
  }
  res.json({
    status: 'ok',
    database: isSupabaseConfigured() ? 'sqlite+supabase' : 'sqlite',
  });
});

// Test-only hook for verifying masked error responses without leaking internals (active only when NODE_ENV === 'test')
if (process.env.NODE_ENV === 'test') {
  app.get('/api/__test__/force-error', (_req, _res) => {
    throw new Error('Test forced internal server error');
  });
}

// Bootstrap endpoint for initial load (scopes unpublished drafts & admin reports to admin role)
app.get('/api/bootstrap', (req, res) => {
  const session = getSessionUser(req);
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin';
  const isStaff = isStaffRole(session?.role);
  const allQuestions = getAllQuestions(isAdmin);
  const questionsToSend = isAdmin ? allQuestions : allQuestions.map(toPublicQuestion);
  const userId = session ? session.userId : 'usr-guest';
  res.json({
    success: true,
    questions: questionsToSend,
    categories: getAllCategories(),
    reports: isAdmin ? getAllReports() : [],
    stats: session && !isStaff ? getUserStats(userId) : null,
    sourcePdfs: isAdmin ? listSourcePdfs() : [],
    user: session
      ? {
          id: session.userId,
          username: session.username,
          email: session.email,
          role: session.role,
          displayName: session.displayName,
          emailVerified: session.emailVerified,
        }
      : null,
  });
});

// ==================== WEEKLY GRAND TEST WINDOW ====================
app.get('/api/exam-window', (_req, res) => {
  const window = getGrandTestWindow(new Date());
  return res.json({
    success: true,
    isOpen: window.isOpen,
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
    serverTime: new Date().toISOString(),
  });
});

// ==================== AUTHENTICATION APIs ====================
function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}

/**
 * Creates a session and keeps the newest MAX_ACTIVE_SESSIONS for the account.
 * The token itself is only ever returned to its own client.
 */
function recordSession(
  req: express.Request,
  tokenHash: string,
  userId: string,
  role: string,
  createdAt: string
): void {
  const userAgent = minimizeUserAgent(req.headers['user-agent']);
  const ip = minimizeIp(req.ip);
  db.prepare(
    'INSERT INTO sessions (token, user_id, role, created_at, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(tokenHash, userId, role, createdAt, userAgent, ip);
  syncInsertSession(tokenHash, userId, role, createdAt, userAgent || undefined, ip || undefined);

  const newer = db
    .prepare(
      'SELECT token FROM sessions WHERE user_id = ? AND token <> ? ORDER BY created_at DESC, rowid DESC'
    )
    .all(userId, tokenHash) as { token: string }[];
  const excess = newer.slice(MAX_ACTIVE_SESSIONS - 1);
  const remove = db.prepare('DELETE FROM sessions WHERE token = ?');
  for (const row of excess) {
    remove.run(row.token);
    syncDeleteSession(row.token);
  }
}

function currentTokenHash(req: express.Request): string {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? hashToken(header.slice(7)) : '';
}

/**
 * Issues a session token, records session metadata with IP/UA, trims excess sessions,
 * and returns the standard authentication response payload.
 */
function issueUserSession(req: express.Request, res: express.Response, userRow: any) {
  const activeRole = userRow.role;
  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  recordSession(req, tokenHash, userRow.id, activeRole, now);

  let parsedStats = null;
  if (!isStaffRole(activeRole)) {
    try {
      parsedStats = JSON.parse(userRow.stats_json);
    } catch {
      parsedStats = DEFAULT_USER_STATS;
    }
  }

  return res.json({
    success: true,
    token: rawToken,
    user: {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email || undefined,
      role: activeRole,
      displayName: userRow.display_name,
      emailVerified: userRow.email_verified !== 0,
      hasPassword: Boolean(userRow.password_hash),
      isGoogleLinked: Boolean(userRow.google_sub),
    },
    stats: parsedStats,
  });
}

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const rawId = req.body?.identifier ?? req.body?.username;
  const rawPw = req.body?.password;

  if (
    typeof rawId !== 'string' ||
    !rawId.trim() ||
    typeof rawPw !== 'string' ||
    !rawPw ||
    rawPw.length > 128
  ) {
    return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
  }

  const loginId = rawId.toLowerCase().trim();
  const userRow = getUserByEmailOrUsername(loginId);

  // If user does not exist or has no password (e.g. Google-only account),
  // run a dummy verifyPassword scrypt compare for constant-time rejection.
  if (!userRow || !userRow.password_hash) {
    await verifyPassword(
      rawPw,
      '00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    );
    return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
  }

  if (!(await verifyPassword(rawPw, userRow.password_hash))) {
    return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
  }

  // Check account status flags (disabled / suspended)
  if (userRow.status === 'disabled' || userRow.status === 'suspended' || userRow.disabled || userRow.is_disabled) {
    return res.status(403).json({ success: false, error: 'Account is suspended or disabled.' });
  }

  // Upgrade legacy unsalted hash to per-user random salt if needed
  if (!userRow.password_hash.includes(':')) {
    const upgradedHash = await hashPassword(rawPw);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(upgradedHash, userRow.id);
    syncPatchUser(userRow.id, { password_hash: upgradedHash });
  }

  return issueUserSession(req, res, userRow);
});

app.post('/api/auth/google', loginLimiter, async (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!googleClientId) {
    return res.status(404).json({ success: false, error: 'Google sign-in is not enabled.' });
  }

  const credential = req.body?.credential;
  if (!credential || typeof credential !== 'string' || !credential.trim() || credential.length > 8192) {
    return res.status(400).json({ success: false, error: 'A valid Google credential is required.' });
  }

  // Token verification (supports mock payload injection in test environment)
  let verifiedPayload: { sub: string; email: string; name?: string; emailVerified: boolean } | null = null;
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-google-mock']) {
    try {
      const decoded = JSON.parse(Buffer.from(String(req.headers['x-test-google-mock']), 'base64').toString('utf8'));
      if (decoded.error) {
        verifiedPayload = null;
      } else if (decoded.aud && decoded.aud !== googleClientId) {
        verifiedPayload = null;
      } else if (decoded.email_verified !== true) {
        verifiedPayload = null;
      } else if (decoded.sub && decoded.email) {
        verifiedPayload = {
          sub: String(decoded.sub).trim(),
          email: String(decoded.email).trim().toLowerCase(),
          name: decoded.name ? String(decoded.name).trim() : undefined,
          emailVerified: true,
        };
      }
    } catch {
      verifiedPayload = null;
    }
  } else {
    verifiedPayload = await verifyGoogleIdToken(credential, googleClientId);
  }

  if (!verifiedPayload || !verifiedPayload.sub || !verifiedPayload.email || !verifiedPayload.emailVerified) {
    return res.status(401).json({ success: false, error: 'Invalid Google authentication credential.' });
  }

  const { sub: googleSub, email: normalizedEmail, name: googleName } = verifiedPayload;

  let resolvedUser: any = null;
  let isNewUser = false;
  let linkedExistingId: string | null = null;
  let hijackedUnverified = false;
  let newUserId = '';
  let newUsername = '';
  let finalDisplayName = '';
  let statsJson = '';
  let nowIso = '';

  db.exec('BEGIN IMMEDIATE');
  try {
    // 6a. User found by google_sub: log in that user (even if the Google email has since changed)
    const bySub = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(googleSub) as any;

    if (bySub) {
      resolvedUser = bySub;
    } else {
      // 6b. Else user found by normalized email
      const existingByEmail = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail) as any;

      if (existingByEmail) {
        linkedExistingId = existingByEmail.id;
        if (existingByEmail.email_verified === 0) {
          // Pre-hijack protection: unverified email account registered by someone else
          // Clear its password hash and revoke all existing sessions & reset/verify tokens
          hijackedUnverified = true;
          db.prepare(
            `UPDATE users
             SET google_sub = ?, email_verified = 1, password_hash = NULL,
                 email_verify_token_hash = NULL, email_verify_expires = NULL
             WHERE id = ?`
          ).run(googleSub, existingByEmail.id);
          db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existingByEmail.id);
          db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(existingByEmail.id);
        } else {
          // Existing verified account: link google_sub and ensure email_verified is true
          db.prepare('UPDATE users SET google_sub = ?, email_verified = 1 WHERE id = ?').run(googleSub, existingByEmail.id);
        }
        resolvedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(existingByEmail.id);
      } else {
        // 6c. Create new user with default 'student' role, verified email, and no usable password
        isNewUser = true;
        newUserId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        nowIso = new Date().toISOString();

        // Unique username generator matching format
        const emailPrefix = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24) || 'candidate';
        let candidate = emailPrefix;
        let counter = 1;
        while (db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(candidate)) {
          candidate = `${emailPrefix}_${counter++}`;
        }
        newUsername = candidate;

        finalDisplayName = googleName || normalizedEmail.split('@')[0];
        const initialStats = {
          ...DEFAULT_USER_STATS,
          lastActiveDate: nowIso.slice(0, 10),
          bookmarkedIds: [],
          bookmarkMeta: {},
          revisionQueueIds: [],
          mistakeStreaks: {},
          subjectPerformance: {},
          topicPerformance: {},
          examRecords: [],
        };
        statsJson = JSON.stringify(initialStats);

        db.prepare(
          `INSERT INTO users (id, username, email, password_hash, role, display_name, stats_json, created_at, email_verified, google_sub)
           VALUES (?, ?, ?, NULL, 'student', ?, ?, ?, 1, ?)`
        ).run(newUserId, newUsername, normalizedEmail, finalDisplayName, statsJson, nowIso, googleSub);

        resolvedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
      }
    }

    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }

  // Account status check (refuse login if disabled/suspended/deleted)
  if (!resolvedUser) {
    return res.status(401).json({ success: false, error: 'User record not found.' });
  }
  if (resolvedUser.status === 'disabled' || resolvedUser.status === 'suspended' || resolvedUser.disabled || resolvedUser.is_disabled) {
    return res.status(403).json({ success: false, error: 'Account is suspended or disabled.' });
  }

  // Optional Supabase sync for newly created or linked user
  if (isNewUser) {
    syncUpsertUser({
      id: newUserId,
      username: newUsername,
      email: normalizedEmail,
      password_hash: null,
      role: 'student',
      display_name: finalDisplayName,
      stats_json: statsJson,
      created_at: nowIso,
      email_verified: 1,
      google_sub: googleSub,
    });
  } else if (linkedExistingId) {
    if (hijackedUnverified) {
      syncPatchUser(linkedExistingId, {
        google_sub: googleSub,
        email_verified: 1,
        password_hash: null,
        email_verify_token_hash: null,
        email_verify_expires: null,
      });
      syncDeleteUserSessions(linkedExistingId);
      syncDeleteUserPasswordResets(linkedExistingId);
    } else {
      syncPatchUser(linkedExistingId, {
        google_sub: googleSub,
        email_verified: 1,
      });
    }
  }

  return issueUserSession(req, res, resolvedUser);
});

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  const { username, email, password, displayName } = req.body;
  if (!username || !password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'Username and a password between 8 and 128 characters are required.',
    });
  }

  const cleanUsername = String(username).toLowerCase().trim();
  const cleanEmail = email ? String(email).toLowerCase().trim() : null;

  if (cleanEmail && !cleanEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existingUser) {
    return res.status(409).json({ success: false, error: 'Username is already registered.' });
  }

  if (cleanEmail) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }
  }

  // Public self-registration always creates 'student' role.
  // Administrative promotions can only be granted by an existing Head Administrator.
  const role: 'student' = 'student';
  const emailVerified = cleanEmail && emailVerificationRequired ? 0 : 1;

  const id = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const initialStats = {
    ...DEFAULT_USER_STATS,
    lastActiveDate: now.slice(0, 10),
    bookmarkedIds: [],
    bookmarkMeta: {},
    revisionQueueIds: [],
    mistakeStreaks: {},
    subjectPerformance: {},
    topicPerformance: {},
    examRecords: [],
  };

  const passwordHash = await hashPassword(password);
  const finalDisplayName = displayName?.trim() || cleanUsername;
  const statsJson = JSON.stringify(initialStats);

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, role, display_name, stats_json, created_at, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    cleanUsername,
    cleanEmail,
    passwordHash,
    role,
    finalDisplayName,
    statsJson,
    now,
    emailVerified
  );

  syncUpsertUser({
    id,
    username: cleanUsername,
    email: cleanEmail || undefined,
    password_hash: passwordHash,
    role,
    display_name: finalDisplayName,
    stats_json: statsJson,
    created_at: now,
    email_verified: emailVerified,
  });

  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = hashToken(rawToken);
  recordSession(req, tokenHash, id, role, now);

  let emailSent = true;
  if (cleanEmail && emailVerificationRequired) {
    void sendWelcomeEmail(cleanEmail, finalDisplayName).catch((err) => {
      console.warn('[Welcome Email Failed]', err);
    });
    const verifyToken = createEmailVerification(id);
    try {
      const delivery = await sendVerificationEmail(cleanEmail, finalDisplayName, verifyToken);
      if (!delivery.success) {
        emailSent = false;
        console.warn('[Verification Email Failed]', delivery.error);
      }
    } catch (err) {
      emailSent = false;
      console.warn('[Verification Email Failed]', err);
    }
  }

  return res.json({
    success: true,
    token: rawToken,
    emailSent,
    user: {
      id,
      username: cleanUsername,
      email: cleanEmail || undefined,
      role,
      displayName: finalDisplayName,
      emailVerified: Boolean(emailVerified),
      hasPassword: true,
      isGoogleLinked: false,
    },
    stats: initialStats,
  });
});

app.post('/api/auth/forgot-password', forgotPasswordLimiter, (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const user = db.prepare('SELECT id, email, display_name FROM users WHERE email = ?').get(cleanEmail) as any;

  if (user) {
    const token = createPasswordReset(user.id);
    void sendPasswordResetEmail(user.email, token)
      .then((delivery) => {
        if (!delivery.success) console.warn('[Reset Email Failed]', delivery.error);
      })
      .catch((err) => console.warn('[Reset Email Failed]', err));
  }

  // Always return success to protect privacy
  return res.json({
    success: true,
    message: 'If an account exists with this email address, password reset instructions have been dispatched.',
  });
});

app.post('/api/auth/reset-password', resetPasswordLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'Valid reset token and a new password between 8 and 128 characters are required.',
    });
  }

  const newHash = await hashPassword(String(newPassword));
  const result = verifyAndConsumeResetToken(String(token).trim(), newHash);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json({ success: true, message: 'Password has been reset successfully. You may now sign in.' });
});

app.post('/api/auth/verify-email', emailVerificationLimiter, (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token || token.length > 200) {
    return res.status(400).json({ success: false, error: 'A valid verification token is required.' });
  }

  const result = verifyEmailToken(token);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, message: 'Email verified successfully. Thank you.' });
});

app.post('/api/auth/resend-verification', emailVerificationLimiter, async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const row = db
    .prepare('SELECT email, email_verified, display_name FROM users WHERE id = ?')
    .get(session.userId) as { email: string | null; email_verified: number; display_name: string } | undefined;

  if (!row) {
    return res.status(404).json({ success: false, error: 'Account not found.' });
  }
  if (!row.email) {
    return res.status(400).json({ success: false, error: 'This account has no email address to verify.' });
  }
  if (row.email_verified) {
    return res.json({ success: true, alreadyVerified: true, message: 'Email is already verified.' });
  }

  const token = createEmailVerification(session.userId);
  let delivery: { success: boolean; error?: string };
  try {
    delivery = await sendVerificationEmail(row.email, row.display_name || session.displayName, token);
  } catch (err: any) {
    delivery = { success: false, error: err?.message || 'Network error reaching the email provider' };
  }

  if (!delivery.success) {
    console.warn('[Verification Email Failed]', delivery.error);
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        success: true,
        delivered: false,
        message:
          'Email delivery failed in this environment. The verification link was printed to the server terminal.',
      });
    }
    return res.status(502).json({
      success: false,
      error: 'Could not send the verification email. Please try again shortly.',
    });
  }

  return res.json({ success: true, message: 'Verification email sent. Check your inbox.' });
});

app.post('/api/auth/change-password', changePasswordLimiter, async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ success: false, error: 'New password must be between 8 and 128 characters.' });
  }

  const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(session.userId) as any;
  if (!userRow) {
    return res.status(404).json({ success: false, error: 'User record not found.' });
  }

  if (!userRow.password_hash) {
    return res.status(400).json({
      success: false,
      error: 'Your account does not have a password set. Please use "Forgot password" to set one.',
    });
  }

  if (!(await verifyPassword(String(currentPassword), userRow.password_hash))) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
  }

  const rawToken = req.headers.authorization?.slice(7);
  const currentTokenHash = rawToken ? hashToken(rawToken) : '';
  const newHash = await hashPassword(String(newPassword));

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, session.userId);
    // Delete all OTHER sessions for that user, keeping the current session
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(session.userId, currentTokenHash);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  syncPatchUser(session.userId, { password_hash: newHash });
  syncDeleteUserSessions(session.userId, currentTokenHash || undefined);

  return res.json({ success: true, message: 'Password changed successfully.' });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7);
    const tokenHash = hashToken(rawToken);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(tokenHash);
    syncDeleteSession(tokenHash);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/sessions', (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  const current = currentTokenHash(req);
  const rows = db
    .prepare(
      'SELECT token, created_at, user_agent FROM sessions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC'
    )
    .all(session.userId) as { token: string; created_at: string; user_agent: string | null }[];

  return res.json({
    success: true,
    maxSessions: MAX_ACTIVE_SESSIONS,
    sessions: rows.map((row) => ({
      createdAt: row.created_at,
      device: describeUserAgent(row.user_agent),
      current: row.token === current,
    })),
  });
});

app.post('/api/auth/sessions/revoke-others', (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  const current = currentTokenHash(req);
  if (!current) {
    return res.status(400).json({ success: false, error: 'Missing session token.' });
  }
  const result = db
    .prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?')
    .run(session.userId, current);
  syncDeleteUserSessions(session.userId, current);
  return res.json({ success: true, revoked: Number(result.changes || 0) });
});

app.get('/api/auth/me', (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthenticated or session expired.' });
  }

  const userRow = db
    .prepare('SELECT stats_json, leaderboard_hidden, password_hash, google_sub FROM users WHERE id = ?')
    .get(session.userId) as any;
  let stats = null;
  if (userRow?.stats_json && session.role === 'student') {
    try {
      stats = JSON.parse(userRow.stats_json);
    } catch {}
  }

  return res.json({
    success: true,
    user: {
      id: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
      emailVerified: !emailVerificationRequired || session.emailVerified,
      leaderboardHidden: userRow?.leaderboard_hidden === 1,
      hasPassword: Boolean(userRow?.password_hash),
      isGoogleLinked: Boolean(userRow?.google_sub),
    },
    stats,
  });
});

const handleUpdatePreferences = (req: express.Request, res: express.Response) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { leaderboardHidden } = req.body || {};
  if (typeof leaderboardHidden !== 'boolean') {
    return res.status(400).json({ success: false, error: 'leaderboardHidden must be a boolean.' });
  }

  db.prepare('UPDATE users SET leaderboard_hidden = ? WHERE id = ?').run(
    leaderboardHidden ? 1 : 0,
    session.userId
  );

  return res.json({
    success: true,
    leaderboardHidden,
  });
};

app.patch('/api/auth/preferences', requireAuth, handleUpdatePreferences);
app.patch('/api/auth/me', requireAuth, handleUpdatePreferences);

app.get('/api/auth/export', accountExportLimiter, (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const userRow = db.prepare('SELECT id, username, email, role, display_name, created_at, stats_json, leaderboard_hidden FROM users WHERE id = ?').get(session.userId) as any;
  if (!userRow) {
    return res.status(404).json({ success: false, error: 'User record not found.' });
  }

  const isStudent = userRow.role === 'student';
  let stats = null;
  if (isStudent && userRow.stats_json) {
    try {
      stats = JSON.parse(userRow.stats_json);
    } catch {}
  }

  const activeExams = isStudent
    ? (db.prepare('SELECT id, title, started_at, duration_minutes FROM active_exams WHERE user_id = ?').all(session.userId) as any[])
    : [];
  const examAttempts = isStudent
    ? (db.prepare('SELECT id, title, total, correct_count, score, percentage, passed, time_spent_seconds, completed_at, is_grand_test FROM exam_attempts WHERE user_id = ? ORDER BY completed_at DESC').all(session.userId) as any[])
    : [];
  const submittedReports = db.prepare('SELECT id, question_id, question_code, reason, details, submitted_at, status FROM reports WHERE user_id = ? ORDER BY submitted_at DESC').all(session.userId) as any[];

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email || null,
      role: userRow.role,
      displayName: userRow.display_name,
      createdAt: userRow.created_at,
      leaderboardHidden: userRow.leaderboard_hidden === 1,
    },
    stats: stats || {},
    examHistory: stats?.examRecords || [],
    examAttempts: examAttempts || [],
    activeExams: activeExams || [],
    submittedReports: submittedReports || [],
  };

  const filename = `prayogshala-export-${encodeURIComponent(userRow.username)}-${Date.now()}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(JSON.stringify(exportPayload, null, 2));
});

app.delete('/api/auth/account', accountDeleteLimiter, async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;
  if (!userRow) {
    return res.status(404).json({ success: false, error: 'User record not found.' });
  }

  if (userRow.password_hash) {
    const { currentPassword } = req.body || {};
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'Current password is required to delete your account.' });
    }
    if (!(await verifyPassword(String(currentPassword), userRow.password_hash))) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }
  } else {
    // Google-only account: require fresh Google credential
    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ success: false, error: 'Google re-authentication is required to delete your account.' });
    }
    const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!googleClientId) {
      return res.status(400).json({ success: false, error: 'Google authentication is not configured on this server.' });
    }

    let payload: { sub: string } | null = null;
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-google-mock']) {
      try {
        payload = JSON.parse(Buffer.from(String(req.headers['x-test-google-mock']), 'base64').toString('utf8'));
      } catch {}
    } else {
      payload = await verifyGoogleIdToken(credential, googleClientId);
    }

    if (!payload || payload.sub !== userRow.google_sub) {
      return res.status(401).json({ success: false, error: 'Google re-authentication failed.' });
    }
  }

  // Refuse if user is the last superadmin
  if (userRow.role === 'superadmin') {
    const superAdminCountRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'").get() as any;
    if (superAdminCountRow.count <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the sole superadmin account. Promote another superadmin first.',
      });
    }
  }

  // Execute deletion across all related tables within a transaction
  try {
    db.exec('BEGIN');
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM exam_attempts WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM active_exams WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM payments WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM practice_usage WHERE usage_key = ?').run(`user:${session.userId}`);
    db.prepare('DELETE FROM exam_usage WHERE usage_key = ?').run(`user:${session.userId}`);
    db.prepare('UPDATE reports SET user_id = NULL WHERE user_id = ?').run(session.userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(session.userId);
    db.exec('COMMIT');
  } catch (txErr) {
    try { db.exec('ROLLBACK'); } catch {}
    throw txErr;
  }

  // If Supabase sync is enabled, delete user row there too, catching errors
  syncDeleteUser(session.userId);

  return res.json({
    success: true,
    message: 'Your account and associated personal data have been permanently deleted.',
  });
});

// ==================== USER & STAFF MANAGEMENT APIs ====================
app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = listAllUsers();
  return res.json({ success: true, users });
});

app.patch('/api/admin/users/:id/role', requireSuperAdmin, (req, res) => {
  const targetId = req.params.id;
  const { role } = req.body;
  if (!['admin', 'student'].includes(role)) {
    return res.status(400).json({ success: false, error: "Role must be 'admin' or 'student'." });
  }

  const result = updateUserRole(targetId, role);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // A promoted staff member must start with no candidate study data.
  if (role === 'admin') {
    purgeStaffStudyData();
  }

  // Immediately revoke all active sessions for the user whose role changed
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
  syncDeleteUserSessions(targetId);

  if (isSupabaseConfigured()) {
    syncUpdateUserRole(targetId, role);
  }

  return res.json({ success: true, role });
});

app.post('/api/admin/users', requireSuperAdmin, async (req, res) => {
  const { username, email, displayName, role = 'admin', password } = req.body;
  if (!username || !email || !displayName) {
    return res.status(400).json({ success: false, error: 'Username, email, and display name are required.' });
  }

  if (role === 'superadmin') {
    return res.status(400).json({ success: false, error: "Cannot assign 'superadmin' role via user invitation." });
  }
  if (role && !['admin', 'student'].includes(role)) {
    return res.status(400).json({ success: false, error: "Role must be 'admin' or 'student'." });
  }

  const cleanUsername = String(username).toLowerCase().trim();
  const cleanEmail = String(email).toLowerCase().trim();

  if (db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername)) {
    return res.status(409).json({ success: false, error: 'Username is already taken.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)) {
    return res.status(409).json({ success: false, error: 'Email address is already registered.' });
  }

  const tempPassword = password || crypto.randomBytes(6).toString('hex');
  const passwordHash = await hashPassword(tempPassword);
  const id = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const assignedRole = role === 'student' ? 'student' : 'admin';
  const statsJson = JSON.stringify(DEFAULT_USER_STATS);

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, role, display_name, stats_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    cleanUsername,
    cleanEmail,
    passwordHash,
    assignedRole,
    displayName.trim(),
    statsJson,
    now
  );

  syncUpsertUser({
    id,
    username: cleanUsername,
    email: cleanEmail,
    password_hash: passwordHash,
    role: assignedRole,
    display_name: displayName.trim(),
    stats_json: statsJson,
    created_at: now,
  });

  // Send invitation email with credentials via Resend
  void sendStaffInviteEmail(cleanEmail, displayName.trim(), assignedRole as any, tempPassword).catch((err) => {
    console.warn('[Staff Invite Email Failed]', err);
  });

  return res.json({
    success: true,
    user: {
      id,
      username: cleanUsername,
      email: cleanEmail,
      displayName: displayName.trim(),
      role: assignedRole,
      createdAt: now,
    },
    tempPassword,
  });
});

// ==================== BILLING & SUBSCRIPTIONS ====================
function siteBaseUrl(req: express.Request): string {
  const rawSiteUrl = process.env.SITE_URL?.trim();
  return (rawSiteUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

app.get('/api/billing/plans', (_req, res) => {
  return res.json({
    success: true,
    plans: listPlans(),
    gateways: {
      esewa: isEsewaConfigured(),
      khalti: isKhaltiConfigured(),
      simulate: process.env.BILLING_SIMULATE === 'true',
    },
    freeTier: {
      practicePerUnit: FREE_PRACTICE_PER_UNIT,
      mockExams: FREE_MOCK_EXAMS,
    },
  });
});

app.get('/api/billing/status', (req, res) => {
  const session = getSessionUser(req);
  const usageKey = usageKeyFor(session, req);
  return res.json({
    success: true,
    fullAccess: hasFullAccess(session),
    subscription: session ? getActiveSubscription(session.userId) : null,
    usage: {
      practice: listPracticeUsage(usageKey),
      mocks: getMockQuota(usageKey),
    },
    limits: {
      practicePerUnit: FREE_PRACTICE_PER_UNIT,
      mockExams: FREE_MOCK_EXAMS,
    },
  });
});

app.post('/api/billing/checkout', billingCheckoutLimiter, async (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Sign in to purchase a plan.' });
  }
  if (session.role !== 'student') {
    return res.status(403).json({ success: false, error: 'Staff accounts cannot purchase subscriptions.' });
  }

  const { planId, gateway } = req.body || {};
  const plan = getPlan(String(planId || ''));
  if (!plan) {
    return res.status(400).json({ success: false, error: 'Unknown or inactive plan.' });
  }
  if (gateway !== 'esewa' && gateway !== 'khalti') {
    return res.status(400).json({ success: false, error: "Gateway must be 'esewa' or 'khalti'." });
  }

  // Development/demo shortcut: instantly activate without contacting a gateway.
  if (process.env.BILLING_SIMULATE === 'true') {
    const payment = createPayment(session.userId, plan, 'simulate');
    updatePayment(payment.id, { status: 'completed', gatewayRef: `sim-${payment.id}` });
    const subscription = activateSubscription(session.userId, plan, 'simulate', null);
    return res.json({ success: true, simulated: true, subscription });
  }

  if (gateway === 'esewa' && !isEsewaConfigured()) {
    return res.status(503).json({ success: false, error: 'eSewa payments are not configured on this server.' });
  }
  if (gateway === 'khalti' && !isKhaltiConfigured()) {
    return res.status(503).json({ success: false, error: 'Khalti payments are not configured on this server.' });
  }

  const payment = createPayment(session.userId, plan, gateway);
  const base = siteBaseUrl(req);

  if (gateway === 'esewa') {
    const checkout = buildEsewaCheckout({
      paymentId: payment.id,
      amountNpr: plan.priceNpr,
      successUrl: `${base}/api/billing/esewa/callback?pid=${encodeURIComponent(payment.id)}`,
      failureUrl: `${base}/payment/result?status=failure&gateway=esewa`,
    });
    return res.json({ success: true, checkout });
  }

  try {
    const checkout = await createKhaltiCheckout({
      paymentId: payment.id,
      amountNpr: plan.priceNpr,
      planName: plan.name,
      returnUrl: `${base}/payment/result?gateway=khalti`,
      websiteUrl: base,
      customer: { name: session.displayName, email: session.email },
    });
    updatePayment(payment.id, { gatewayRef: checkout.pidx });
    return res.json({ success: true, checkout });
  } catch (err: any) {
    updatePayment(payment.id, { status: 'failed', gatewayPayload: String(err?.message || err) });
    return res.status(502).json({ success: false, error: 'Could not initiate Khalti payment. Please try again.' });
  }
});

// eSewa redirects the payer here after checkout (success_url).
app.get('/api/billing/esewa/callback', async (req, res) => {
  const failureRedirect = '/payment/result?status=failure&gateway=esewa';
  const successRedirect = '/payment/result?status=success&gateway=esewa';

  const paymentId = String(req.query.pid || '');
  const payment = getPayment(paymentId);
  if (!payment || payment.gateway !== 'esewa') {
    return res.redirect(failureRedirect);
  }
  // Idempotent: repeated callbacks for an activated payment just succeed.
  if (payment.status === 'completed') {
    return res.redirect(successRedirect);
  }

  const data = decodeEsewaCallback(String(req.query.data || ''));
  if (!data || data.transaction_uuid !== paymentId || !verifyEsewaCallbackSignature(data)) {
    updatePayment(paymentId, { status: 'failed', gatewayPayload: String(req.query.data || '').slice(0, 2000) });
    return res.redirect(failureRedirect);
  }

  const callbackAmount = parseFloat(String(data.total_amount || '0'));
  if (Math.abs(callbackAmount - payment.amountNpr) > 0.01) {
    updatePayment(paymentId, { status: 'failed', gatewayPayload: JSON.stringify(data).slice(0, 2000) });
    return res.redirect(failureRedirect);
  }

  // Server-to-server confirmation; fall back to the signed callback status.
  const status = await checkEsewaStatus({ paymentId, amountNpr: payment.amountNpr });
  const isComplete = status?.status === 'COMPLETE' || (!status && data.status === 'COMPLETE');
  if (!isComplete) {
    updatePayment(paymentId, {
      status: 'failed',
      gatewayPayload: JSON.stringify({ callback: data, statusCheck: status }).slice(0, 4000),
    });
    return res.redirect(failureRedirect);
  }

  const plan = getPlanAny(payment.planId);
  if (!plan) {
    updatePayment(paymentId, { status: 'failed', gatewayPayload: 'Plan no longer exists' });
    return res.redirect(failureRedirect);
  }

  updatePayment(paymentId, {
    status: 'completed',
    gatewayRef: status?.refId || data.transaction_code || null,
    gatewayPayload: JSON.stringify(data).slice(0, 4000),
  });
  activateSubscription(payment.userId, plan, 'esewa', null);
  return res.redirect(successRedirect);
});

// Khalti returns the payer to /payment/result?gateway=khalti&pidx=... and the
// frontend calls this endpoint to confirm before we unlock the account.
app.post('/api/billing/khalti/verify', async (req, res) => {
  const pidx = String(req.body?.pidx || '');
  if (!pidx || pidx.length > 100) {
    return res.status(400).json({ success: false, error: 'A valid pidx is required.' });
  }

  const payment = findPaymentByGatewayRef('khalti', pidx);
  if (!payment) {
    return res.status(404).json({ success: false, error: 'Payment not found.' });
  }
  if (payment.status === 'completed') {
    return res.json({ success: true, subscription: getActiveSubscription(payment.userId) });
  }

  const result = await verifyKhaltiPayment(pidx);
  if (!result) {
    return res.status(502).json({ success: false, error: 'Could not reach Khalti to confirm the payment. Retry shortly.' });
  }

  if (result.status === 'Completed') {
    const amountMatches =
      result.totalAmountPaisa === undefined || result.totalAmountPaisa === payment.amountNpr * 100;
    if (!amountMatches) {
      updatePayment(payment.id, { status: 'failed', gatewayPayload: JSON.stringify(result).slice(0, 4000) });
      return res.status(402).json({ success: false, error: 'Paid amount does not match the plan price.' });
    }
    const plan = getPlanAny(payment.planId);
    if (!plan) {
      updatePayment(payment.id, { status: 'failed', gatewayPayload: 'Plan no longer exists' });
      return res.status(500).json({ success: false, error: 'Plan no longer available.' });
    }
    updatePayment(payment.id, {
      status: 'completed',
      gatewayRef: result.transactionId || pidx,
      gatewayPayload: JSON.stringify(result).slice(0, 4000),
    });
    const subscription = activateSubscription(payment.userId, plan, 'khalti', null);
    return res.json({ success: true, subscription });
  }

  const cancelled = result.status === 'User canceled' || result.status === 'Expired';
  updatePayment(payment.id, {
    status: cancelled ? 'cancelled' : 'failed',
    gatewayPayload: JSON.stringify(result).slice(0, 4000),
  });
  return res.status(402).json({ success: false, error: `Payment not completed (status: ${result.status}).` });
});

// Admin: subscription overview and manual grant/revoke (bank transfer, promos)
app.get('/api/admin/subscriptions', requireAdmin, (_req, res) => {
  return res.json({ success: true, subscriptions: listSubscriptionsForAdmin() });
});

app.post('/api/admin/users/:id/subscription', requireAdmin, (req, res) => {
  const targetId = req.params.id;
  const rawDays = parseInt(String(req.body?.durationDays), 10);
  const durationDays = Number.isNaN(rawDays) ? 0 : Math.max(1, Math.min(3660, rawDays));
  if (!durationDays) {
    return res.status(400).json({ success: false, error: 'durationDays between 1 and 3660 is required.' });
  }

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  if (target.role !== 'student') {
    return res.status(400).json({ success: false, error: 'Subscriptions only apply to student accounts.' });
  }

  const session = getSessionUser(req)!;
  const subscription = grantSubscription(targetId, durationDays, session.userId);
  return res.json({ success: true, subscription });
});

app.delete('/api/admin/users/:id/subscription', requireAdmin, (req, res) => {
  const revoked = revokeSubscription(req.params.id);
  return res.json({ success: true, revoked });
});

// ==================== QUESTIONS & CATEGORIES APIs ====================
app.get('/api/questions', (req, res) => {
  const session = getSessionUser(req);
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin';
  const rawPage = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
  const page = rawPage !== undefined ? (Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage)) : undefined;

  const rawLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  const limit = rawLimit !== undefined ? (Number.isNaN(rawLimit) ? undefined : Math.max(1, Math.min(200, rawLimit))) : undefined;

  const result = queryQuestions({
    unit: req.query.unit as string | undefined,
    subject: req.query.subject as string | undefined,
    topic: req.query.topic as string | undefined,
    difficulty: req.query.difficulty as string | undefined,
    status: req.query.status as string | undefined,
    exam: req.query.exam as string | undefined,
    search: req.query.search as string | undefined,
    page,
    limit,
    includeUnpublished: isAdmin,
  });

  const questionsToSend = isAdmin ? result.questions : result.questions.map(toPublicQuestion);

  res.json({
    success: true,
    ...result,
    questions: questionsToSend,
  });
});

app.get('/api/questions/:id', (req, res) => {
  const q = getQuestionById(req.params.id);
  if (!q) {
    return res.status(404).json({ success: false, error: 'Question not found' });
  }
  const session = getSessionUser(req);
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin';
  if (q.status !== 'Published' && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Question is not published' });
  }
  return res.json({ success: true, question: isAdmin ? q : toPublicQuestion(q) });
});

app.post(
  '/api/questions/:id/check',
  answerCheckHourlyLimiter,
  answerCheckDailyLimiter,
  (req, res) => {
    const q = getQuestionById(req.params.id);
    if (!q) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const session = getSessionUser(req);
    const isAdmin = session?.role === 'admin' || session?.role === 'superadmin';
    if (q.status !== 'Published' && !isAdmin) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Deny check attempts if student is currently taking an active exam containing this question
    if (session?.userId && !isAdmin) {
      const activeExams = db
        .prepare('SELECT id, questions_json, started_at, duration_minutes FROM active_exams WHERE user_id = ?')
        .all(session.userId) as any[];
      for (const exam of activeExams) {
        const startedAtMs = new Date(exam.started_at).getTime();
        const durationSeconds = (exam.duration_minutes || 0) * 60;
        const isExpired = durationSeconds > 0 && Date.now() > (startedAtMs + (durationSeconds + 120) * 1000);
        if (!isExpired) {
          try {
            const examQuestions: MCQQuestion[] = JSON.parse(exam.questions_json);
            if (examQuestions.some((eq) => eq.id === q.id)) {
              return res.status(409).json({
                success: false,
                error: 'Cannot check answers while an active exam session containing this question is in progress.',
              });
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
    }

    const { selected } = req.body || {};
    if (!selected || typeof selected !== 'string') {
      return res.status(400).json({ success: false, error: 'Selected option is required' });
    }

    // Free-tier quota: 20 distinct questions per subject for unsubscribed users.
    if (!isAdmin && !hasFullAccess(session) && process.env.NODE_ENV !== 'test') {
      const usageKey = usageKeyFor(session, req);
      const targetSubject = q.subject || q.unit;
      const consumption = consumePracticeAnswer(usageKey, targetSubject, q.id);
      if (!consumption.allowed) {
        return res.status(402).json({
          success: false,
          code: 'PAYWALL',
          kind: 'practice-quota',
          error: `You have used all ${consumption.quota.limit} free questions in ${targetSubject}. Upgrade to unlock the full question bank.`,
          quota: consumption.quota,
        });
      }
    }

    const normalizedSelected = normalizeAnswer(selected);
    const matchedOption = (q.options || []).find(
      (opt) => normalizeAnswer(opt.id) === normalizedSelected
    );
    if (!matchedOption) {
      return res.status(400).json({ success: false, error: 'Invalid option selected' });
    }

    const correct = normalizeAnswer(matchedOption.id) === normalizeAnswer(q.correctAnswer);

    return res.json({
      success: true,
      correct,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      reference: q.reference || '',
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        ...(opt.rationale ? { rationale: opt.rationale } : {}),
      })),
    });
  }
);

app.post('/api/questions', requireAdmin, (req, res) => {
  const question: MCQQuestion = req.body.question || req.body;
  if (!question || !question.id) {
    return res.status(400).json({ success: false, error: 'Valid question record required' });
  }
  if (question.imageUrl && !isSafeImageUrl(question.imageUrl)) {
    return res.status(400).json({ success: false, error: 'Invalid or unsafe question imageUrl provided.' });
  }
  const validationError = validateQuestionPayload(question);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }
  upsertQuestion(question);
  return res.json({ success: true, question });
});

app.delete('/api/questions/:id', requireAdmin, (req, res) => {
  deleteQuestionById(req.params.id);
  return res.json({ success: true });
});

app.post('/api/questions/bulk-delete', requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ success: false, error: 'ids array of strings required' });
  }
  const deleted = bulkDeleteQuestions(ids);
  return res.json({ success: true, deleted });
});

function validateQuestionPayload(q: any): string | null {
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    return 'Question must be a valid object';
  }
  if (!q.id || typeof q.id !== 'string') {
    return 'Question id is required and must be a string';
  }
  if (!q.questionText || typeof q.questionText !== 'string') {
    return `Question ${q.id}: questionText is required`;
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    return `Question ${q.id}: options must be an array of at least 2 options`;
  }
  for (let i = 0; i < q.options.length; i++) {
    const opt = q.options[i];
    if (typeof opt === 'string') {
      q.options[i] = { id: opt, text: opt };
    } else if (!opt || typeof opt !== 'object' || !opt.id || typeof opt.text !== 'string') {
      return `Question ${q.id}: each option must have an id and text`;
    }
  }
  if (q.imageUrl && !isSafeImageUrl(q.imageUrl)) {
    return `Question ${q.id}: unsafe or invalid imageUrl provided`;
  }
  if (q.pastPaper !== undefined && (typeof q.pastPaper !== 'string' || q.pastPaper.length > 120)) {
    return `Question ${q.id}: pastPaper must be a string of up to 120 characters`;
  }
  if (q.status !== undefined && !ALLOWED_QUESTION_STATUSES.includes(q.status)) {
    return `Question ${q.id}: status must be one of: ${ALLOWED_QUESTION_STATUSES.join(', ')}`;
  }
  // Exam categories are optional metadata. Normalise unknown/missing values to [] so an
  // uploaded question is never forced into a board, and every stored record has an array.
  q.examCategories = normalizeExamCategories(q.examCategories);
  return null;
}

function validateUserStats(stats: any): string | null {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
    return 'stats must be an object';
  }

  try {
    if (JSON.stringify(stats).length > 900_000) {
      return 'Total statistics payload exceeds maximum serialized size (900KB)';
    }
  } catch {
    return 'Failed to serialize statistics';
  }

  const allowedKeys = new Set([
    'totalAnswered',
    'totalCorrect',
    'streakDays',
    'lastActiveDate',
    'bookmarkedIds',
    'bookmarkMeta',
    'revisionQueueIds',
    'mistakeStreaks',
    'subjectPerformance',
    'topicPerformance',
    'examRecords',
  ]);

  for (const key of Object.keys(stats)) {
    if (!allowedKeys.has(key)) {
      return `Unknown field in stats: ${key}`;
    }
  }

  if (
    typeof stats.totalAnswered !== 'number' ||
    stats.totalAnswered < 0 ||
    stats.totalAnswered > 1_000_000 ||
    !Number.isFinite(stats.totalAnswered)
  ) {
    return 'totalAnswered must be a finite number between 0 and 1,000,000';
  }
  if (
    typeof stats.totalCorrect !== 'number' ||
    stats.totalCorrect < 0 ||
    stats.totalCorrect > stats.totalAnswered ||
    !Number.isFinite(stats.totalCorrect)
  ) {
    return 'totalCorrect must be a finite number between 0 and totalAnswered';
  }
  if (
    typeof stats.streakDays !== 'number' ||
    stats.streakDays < 0 ||
    stats.streakDays > 10_000 ||
    !Number.isFinite(stats.streakDays)
  ) {
    return 'streakDays must be a finite number between 0 and 10,000';
  }
  if (typeof stats.lastActiveDate !== 'string' || stats.lastActiveDate.length > 50) {
    return 'lastActiveDate must be a string up to 50 characters';
  }

  if (!Array.isArray(stats.bookmarkedIds) || stats.bookmarkedIds.length > 5000) {
    return 'bookmarkedIds must be an array of up to 5,000 IDs';
  }
  for (const id of stats.bookmarkedIds) {
    if (typeof id !== 'string' || id.length > 100) {
      return 'Invalid bookmark ID in bookmarkedIds';
    }
  }

  if (!Array.isArray(stats.revisionQueueIds) || stats.revisionQueueIds.length > 5000) {
    return 'revisionQueueIds must be an array of up to 5,000 IDs';
  }
  for (const id of stats.revisionQueueIds) {
    if (typeof id !== 'string' || id.length > 100) {
      return 'Invalid revision ID in revisionQueueIds';
    }
  }

  if (stats.bookmarkMeta !== undefined) {
    const meta = stats.bookmarkMeta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      return 'bookmarkMeta must be an object keyed by question ID';
    }
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 2000) {
      return 'bookmarkMeta must contain at most 2,000 entries';
    }
    for (const key of metaKeys) {
      if (key.length === 0 || key.length > 100) {
        return 'Invalid question ID in bookmarkMeta';
      }
      const entry = meta[key];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return 'Invalid bookmarkMeta entry';
      }
      if (entry.note !== undefined && (typeof entry.note !== 'string' || entry.note.length > 1500)) {
        return 'Bookmark notes must be strings of up to 1,500 characters';
      }
      if (entry.folder !== undefined && (typeof entry.folder !== 'string' || entry.folder.length > 60)) {
        return 'Bookmark folders must be strings of up to 60 characters';
      }
      if (entry.updatedAt !== undefined && (typeof entry.updatedAt !== 'string' || entry.updatedAt.length > 40)) {
        return 'Invalid bookmark updatedAt timestamp';
      }
      for (const field of Object.keys(entry)) {
        if (!['note', 'folder', 'updatedAt'].includes(field)) {
          return `Unknown field in bookmarkMeta entry: ${field}`;
        }
      }
    }
  }

  if (stats.mistakeStreaks !== undefined) {
    const streaks = stats.mistakeStreaks;
    if (!streaks || typeof streaks !== 'object' || Array.isArray(streaks)) {
      return 'mistakeStreaks must be an object of question IDs to 0-1 counters';
    }
    const streakKeys = Object.keys(streaks);
    if (streakKeys.length > 5000) {
      return 'mistakeStreaks must contain at most 5,000 entries';
    }
    for (const key of streakKeys) {
      if (key.length === 0 || key.length > 100) {
        return 'Invalid question ID in mistakeStreaks';
      }
      const value = streaks[key];
      if (!Number.isInteger(value) || value < 0 || value > 1) {
        return 'mistakeStreaks counters must be integers between 0 and 1';
      }
    }
  }

  if (
    !stats.subjectPerformance ||
    typeof stats.subjectPerformance !== 'object' ||
    Array.isArray(stats.subjectPerformance)
  ) {
    return 'subjectPerformance must be an object';
  }
  const subKeys = Object.keys(stats.subjectPerformance);
  if (subKeys.length > 100) return 'subjectPerformance exceeds maximum subjects';
  for (const k of subKeys) {
    if (k.length > 100) return 'Subject name too long';
    const sub = stats.subjectPerformance[k];
    if (
      !sub ||
      typeof sub !== 'object' ||
      typeof sub.answered !== 'number' ||
      typeof sub.correct !== 'number' ||
      sub.answered < 0 ||
      sub.correct < 0 ||
      sub.correct > sub.answered
    ) {
      return 'Invalid subjectPerformance entry';
    }
  }

  if (stats.topicPerformance !== undefined) {
    if (
      !stats.topicPerformance ||
      typeof stats.topicPerformance !== 'object' ||
      Array.isArray(stats.topicPerformance)
    ) {
      return 'topicPerformance must be an object';
    }
    const topKeys = Object.keys(stats.topicPerformance);
    if (topKeys.length > 500) return 'topicPerformance exceeds maximum topics';
    for (const k of topKeys) {
      if (k.length > 100) return 'Topic name too long';
      const top = stats.topicPerformance[k];
      if (
        !top ||
        typeof top !== 'object' ||
        typeof top.answered !== 'number' ||
        typeof top.correct !== 'number' ||
        top.answered < 0 ||
        top.correct < 0 ||
        top.correct > top.answered
      ) {
        return 'Invalid topicPerformance entry';
      }
    }
  }

  if (!Array.isArray(stats.examRecords) || stats.examRecords.length > 500) {
    return 'examRecords must be an array of up to 500 records';
  }
  const ALLOWED_EXAM_RECORD_KEYS = new Set([
    'id',
    'date',
    'title',
    'score',
    'total',
    'timeSpentSeconds',
    'passed',
    'pacing',
    'timings',
    'questionTimings',
  ]);
  const ALLOWED_PACING_KEYS = new Set([
    'totalSeconds',
    'timedQuestions',
    'avgSecondsPerQuestion',
    'fastestSeconds',
    'slowestSeconds',
    'rushingCount',
    'overthinkingCount',
    'steadyCount',
    'habit',
    'label',
  ]);
  const ALLOWED_PACING_HABITS = new Set(['rushing', 'overthinking', 'balanced', 'insufficient']);

  for (const rec of stats.examRecords) {
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return 'Invalid exam record';
    for (const key of Object.keys(rec)) {
      if (!ALLOWED_EXAM_RECORD_KEYS.has(key)) {
        return `Unknown field in exam record: ${key}`;
      }
    }
    if (typeof rec.id !== 'string' || rec.id.length === 0 || rec.id.length > 100) return 'Invalid exam record id';
    if (typeof rec.title !== 'string' || rec.title.length > 200) return 'Invalid exam record title';
    if (rec.date !== undefined && (typeof rec.date !== 'string' || rec.date.length > 50)) {
      return 'Invalid exam record date';
    }
    if (
      typeof rec.score !== 'number' ||
      !Number.isFinite(rec.score) ||
      typeof rec.total !== 'number' ||
      !Number.isFinite(rec.total) ||
      rec.total < 0 ||
      rec.total > 10_000 ||
      rec.score > rec.total ||
      rec.score < -rec.total
    ) {
      return 'Invalid exam record score/total';
    }
    if (
      typeof rec.timeSpentSeconds !== 'number' ||
      !Number.isFinite(rec.timeSpentSeconds) ||
      rec.timeSpentSeconds < 0 ||
      rec.timeSpentSeconds > 3_600_000
    ) {
      return 'Invalid exam record timeSpentSeconds';
    }
    if (typeof rec.passed !== 'boolean') return 'Invalid exam record passed';

    if (rec.pacing !== undefined) {
      if (!rec.pacing || typeof rec.pacing !== 'object' || Array.isArray(rec.pacing)) {
        return 'Invalid pacing object in exam record';
      }
      for (const pKey of Object.keys(rec.pacing)) {
        if (!ALLOWED_PACING_KEYS.has(pKey)) {
          return `Unknown field in pacing object: ${pKey}`;
        }
      }
      if (typeof rec.pacing.totalSeconds !== 'number' || !Number.isFinite(rec.pacing.totalSeconds) || rec.pacing.totalSeconds < 0) {
        return 'Invalid pacing totalSeconds';
      }
      if (typeof rec.pacing.timedQuestions !== 'number' || !Number.isFinite(rec.pacing.timedQuestions) || rec.pacing.timedQuestions < 0) {
        return 'Invalid pacing timedQuestions';
      }
      if (rec.pacing.habit !== undefined && !ALLOWED_PACING_HABITS.has(rec.pacing.habit)) {
        return 'Invalid pacing habit';
      }
      if (rec.pacing.label !== undefined && (typeof rec.pacing.label !== 'string' || rec.pacing.label.length > 200)) {
        return 'Invalid pacing label';
      }
    }

    const timings = rec.timings ?? rec.questionTimings;
    if (timings !== undefined) {
      if (Array.isArray(timings)) {
        if (timings.length > 200) return 'Per-question timing array exceeds 200 entries';
        for (const t of timings) {
          if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 3_600_000) {
            return 'Invalid timing value in timing array';
          }
        }
      } else if (typeof timings === 'object' && timings !== null) {
        const keys = Object.keys(timings);
        if (keys.length > 200) return 'Per-question timing entries exceed 200';
        for (const k of keys) {
          const t = timings[k];
          if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 3_600_000) {
            return 'Invalid timing value in timing map';
          }
        }
      } else {
        return 'Invalid question timings format';
      }
    }
  }

  return null;
}

app.post('/api/questions/bulk-upsert', requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'Non-empty questions array required' });
  }
  for (const q of questions) {
    const err = validateQuestionPayload(q);
    if (err) {
      return res.status(400).json({ success: false, error: err });
    }
  }
  bulkInsertQuestions(questions);
  return res.json({ success: true, count: questions.length });
});

const handleBulkQuestionStatus = (req: express.Request, res: express.Response) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || !status) {
    return res.status(400).json({ success: false, error: 'ids array and status required' });
  }
  if (!ALLOWED_QUESTION_STATUSES.includes(status as QuestionStatus)) {
    return res.status(400).json({
      success: false,
      error: `Status must be one of: ${ALLOWED_QUESTION_STATUSES.map((s) => `'${s}'`).join(', ')}.`,
    });
  }
  const updated = bulkUpdateQuestionStatus(ids, status as QuestionStatus);
  return res.json({ success: true, questions: updated });
};

app.post('/api/questions/bulk-status', requireAdmin, handleBulkQuestionStatus);
app.put('/api/questions/bulk-status', requireAdmin, handleBulkQuestionStatus);

app.post('/api/questions/bulk-import', requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'Non-empty questions array required' });
  }
  for (const q of questions) {
    const err = validateQuestionPayload(q);
    if (err) {
      return res.status(400).json({ success: false, error: err });
    }
  }
  bulkInsertQuestions(questions);
  clearStagingDrafts('default-staging');
  return res.json({ success: true, count: questions.length, questions: getAllQuestions(true) });
});

app.put('/api/categories', requireAdmin, (req, res) => {
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    return res.status(400).json({ success: false, error: 'categories array required' });
  }
  saveAllCategories(categories);
  return res.json({ success: true, categories: getAllCategories() });
});

// ==================== ADMIN MOCK SET CONFIGURATION APIs ====================
app.get('/api/mock-sets/configs', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM mock_set_configs').all() as any[];
    return res.json({
      success: true,
      configs: rows.map((r) => ({
        syllabusCode: r.syllabus_code,
        setNumber: r.set_number,
        durationMinutes: r.duration_minutes,
        negativeMarking: Boolean(r.negative_marking),
        penaltyPerWrong: r.penalty_per_wrong,
        passingPercentage: r.passing_percentage,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch mock set configs' });
  }
});

app.put('/api/mock-sets/configs', requireAdmin, (req, res) => {
  const {
    syllabusCode,
    setNumber,
    durationMinutes,
    negativeMarking = true,
    penaltyPerWrong = 0.25,
    passingPercentage = 70,
  } = req.body || {};

  if (!syllabusCode || typeof syllabusCode !== 'string') {
    return res.status(400).json({ success: false, error: 'Syllabus code is required' });
  }
  const rawSet = parseInt(String(setNumber), 10);
  if (Number.isNaN(rawSet) || rawSet < 1 || rawSet > 20) {
    return res.status(400).json({ success: false, error: 'Valid set number (1-20) is required' });
  }
  const rawDuration = parseInt(String(durationMinutes), 10);
  const dur = !Number.isNaN(rawDuration) ? Math.max(5, Math.min(300, rawDuration)) : 50;

  const neg = negativeMarking === true || negativeMarking === 'true' || negativeMarking === 1;
  const rawPenalty = parseFloat(String(penaltyPerWrong));
  const pen = !Number.isNaN(rawPenalty) && rawPenalty >= 0 ? rawPenalty : 0.25;

  const rawPass = parseFloat(String(passingPercentage));
  const pass = !Number.isNaN(rawPass) && rawPass >= 1 && rawPass <= 100 ? rawPass : 70;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO mock_set_configs (syllabus_code, set_number, duration_minutes, negative_marking, penalty_per_wrong, passing_percentage, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(syllabus_code, set_number) DO UPDATE SET
      duration_minutes = excluded.duration_minutes,
      negative_marking = excluded.negative_marking,
      penalty_per_wrong = excluded.penalty_per_wrong,
      passing_percentage = excluded.passing_percentage,
      updated_at = excluded.updated_at
  `).run(syllabusCode, rawSet, dur, neg ? 1 : 0, pen, pass, now);

  return res.json({
    success: true,
    config: {
      syllabusCode,
      setNumber: rawSet,
      durationMinutes: dur,
      negativeMarking: neg,
      penaltyPerWrong: pen,
      passingPercentage: pass,
      updatedAt: now,
    },
  });
});

app.delete('/api/mock-sets/configs/:syllabusCode/:setNumber', requireAdmin, (req, res) => {
  const { syllabusCode, setNumber } = req.params;
  const rawSet = parseInt(setNumber, 10);
  if (!syllabusCode || Number.isNaN(rawSet)) {
    return res.status(400).json({ success: false, error: 'Invalid syllabus code or set number' });
  }
  db.prepare('DELETE FROM mock_set_configs WHERE syllabus_code = ? AND set_number = ?').run(syllabusCode, rawSet);
  return res.json({ success: true, message: 'Reset to blueprint default' });
});

// ==================== PROTECTED EXAM ENGINE APIs ====================
// Protects correct answers during active examinations (Section 4 of app.pdf)
app.post('/api/exams/start', examStartLimiter, (req, res) => {
  const {
    examCategory = 'All',
    subject = 'All',
    unit = 'All',
    difficulty = 'All',
    shuffleOptions = false,
    negativeMarking = false,
  } = req.body || {};

  const rawSetNumber = req.body?.setNumber !== undefined ? parseInt(String(req.body.setNumber), 10) : null;
  const setNumber = Number.isInteger(rawSetNumber) && (rawSetNumber as number) > 0 ? (rawSetNumber as number) : null;

  let useNegativeMarking = negativeMarking === true || negativeMarking === 'true';
  const rawPenalty = req.body?.penaltyPerWrong !== undefined ? parseFloat(String(req.body.penaltyPerWrong)) : NaN;
  let penaltyPerWrong = !Number.isNaN(rawPenalty) && rawPenalty >= 0 ? rawPenalty : DEFAULT_PENALTY_PER_WRONG;

  const rawCount = parseInt(String(req.body?.questionCount), 10);
  const questionCount = Number.isNaN(rawCount) ? 10 : Math.max(1, Math.min(200, rawCount));

  const rawDuration = parseInt(String(req.body?.durationMinutes), 10);
  let durationMinutes = Number.isNaN(rawDuration) ? 15 : Math.max(5, Math.min(300, rawDuration));

  let passingPercentage = examCategory === 'CEE-UG' ? 50 : 70;

  if (setNumber !== null) {
    try {
      const dbCfg = db
        .prepare('SELECT * FROM mock_set_configs WHERE syllabus_code = ? AND set_number = ?')
        .get(examCategory, setNumber) as any;
      if (dbCfg) {
        if (req.body?.durationMinutes === undefined) durationMinutes = dbCfg.duration_minutes;
        if (req.body?.negativeMarking === undefined) useNegativeMarking = Boolean(dbCfg.negative_marking);
        if (req.body?.penaltyPerWrong === undefined) penaltyPerWrong = dbCfg.penalty_per_wrong;
        if (dbCfg.passing_percentage) passingPercentage = dbCfg.passing_percentage;
      }
    } catch {}
  }

  const isGrandTest = Boolean(req.body?.isGrandTest) || (setNumber === null && examCategory !== 'CEE-UG' && questionCount >= 200 && durationMinutes >= 180);
  if (isGrandTest) {
    const window = getGrandTestWindow(new Date());
    if (!window.isOpen && process.env.NODE_ENV !== 'test') {
      return res.status(403).json({
        success: false,
        error: `Weekly Grand Tests are open Friday 11:00 to Tuesday 23:59 (Nepal time). Next window opens ${formatNepalTime(window.opensAt)}.`,
        opensAt: window.opensAt.toISOString(),
        closesAt: window.closesAt.toISOString(),
      });
    }
  }

  const session = getSessionUser(req);

  // Starting a grand test while one is already active returns the active one
  if (isGrandTest && session?.userId && session.userId !== 'usr-guest') {
    const existingActive = db
      .prepare('SELECT * FROM active_exams WHERE user_id = ? AND is_grand_test = 1')
      .get(session.userId) as any;
    if (existingActive) {
      let activeQs: MCQQuestion[] = [];
      try {
        activeQs = JSON.parse(existingActive.questions_json);
      } catch {}
      return res.json({
        success: true,
        examId: existingActive.id,
        title: existingActive.title,
        durationMinutes: existingActive.duration_minutes,
        negativeMarking: Boolean(existingActive.negative_marking),
        penaltyPerWrong:
          typeof existingActive.penalty_per_wrong === 'number'
            ? existingActive.penalty_per_wrong
            : DEFAULT_PENALTY_PER_WRONG,
        passingPercentage:
          typeof existingActive.passing_percentage === 'number'
            ? existingActive.passing_percentage
            : 70,
        questions: activeQs.map(toPublicQuestion),
      });
    }
  }

  const allPublished = getAllQuestions().filter((q) => q.status === 'Published');

  // Free tier: one free mock start per user; a subscription unlocks unlimited mocks.
  if (!hasFullAccess(session) && process.env.NODE_ENV !== 'test') {
    const usageKey = usageKeyFor(session, req);
    const mock = consumeMockStart(usageKey);
    if (!mock.allowed) {
      return res.status(402).json({
        success: false,
        code: 'PAYWALL',
        kind: 'mock-quota',
        error: `You have used your ${mock.quota.limit} free mock exam${mock.quota.limit === 1 ? '' : 's'}. Upgrade to unlock unlimited mock exams and the full question bank.`,
        quota: mock.quota,
      });
    }
  }

  const pool = allPublished.filter((q) => {
    if (examCategory !== 'All' && !questionMatchesExamCategory(q.examCategories, examCategory)) return false;
    if (subject !== 'All' && q.subject !== subject && q.unit !== subject) return false;
    if (unit !== 'All' && q.unit !== unit && q.subject !== unit) return false;
    if (difficulty !== 'All' && q.difficulty !== difficulty) return false;
    return true;
  });

  let preparedQuestions: MCQQuestion[];
  if (isGrandTest) {
    const now = new Date();
    const window = getGrandTestWindow(now);
    const windowStart = window.opensAt.toISOString();

    const existingPaper = db
      .prepare('SELECT question_ids_json FROM weekly_papers WHERE window_start = ?')
      .get(windowStart) as { question_ids_json: string } | undefined;

    let selectedQuestions: MCQQuestion[] = [];
    if (existingPaper) {
      let ids: string[] = [];
      try {
        ids = JSON.parse(existingPaper.question_ids_json);
      } catch {}
      const qMap = new Map(allPublished.map((q) => [q.id, q]));
      let skippedCount = 0;
      for (const id of ids) {
        const q = qMap.get(id);
        if (q) {
          selectedQuestions.push(q);
        } else {
          skippedCount++;
        }
      }
      if (skippedCount > 0) {
        console.info(
          `[Grand Test] Reused paper for window ${windowStart}: skipped ${skippedCount} deleted or unpublished questions.`
        );
      }
    } else {
      // First grand test start in this weekly window:
      // pool = published questions matching the preset, sorted by id
      const sortedPool = [...pool].sort((a, b) => a.id.localeCompare(b.id));
      const seed = window.opensAt.getTime();
      const prng = createMulberry32(seed);
      const shuffledPool = seededShuffle([...sortedPool], prng);
      selectedQuestions = shuffledPool.slice(0, Math.max(0, questionCount));
      const orderedIds = selectedQuestions.map((q) => q.id);
      db.prepare(
        'INSERT OR IGNORE INTO weekly_papers (window_start, question_ids_json, created_at) VALUES (?, ?, ?)'
      ).run(windowStart, JSON.stringify(orderedIds), now.toISOString());
    }

    // Option shuffling stays per attempt
    preparedQuestions = selectedQuestions.map((q) => shuffleQuestionOptions(q, shuffleOptions));
  } else if (setNumber !== null) {
    const sortedPool = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    let seed = 0;
    const seedKey = `${examCategory}-Set-${setNumber}`;
    for (let i = 0; i < seedKey.length; i++) {
      seed = ((seed << 5) - seed + seedKey.charCodeAt(i)) | 0;
    }
    const prng = createMulberry32(Math.abs(seed) || setNumber * 7919);
    const shuffledForSet = seededShuffle([...sortedPool], prng);
    const selectedQuestions = shuffledForSet.slice(0, Math.max(0, Math.min(questionCount, sortedPool.length)));
    preparedQuestions = selectedQuestions.map((q) => shuffleQuestionOptions(q, shuffleOptions));
  } else {
    preparedQuestions = prepareExamQuestions(pool, questionCount, shuffleOptions);
  }

  const examId = `exam-sess-${crypto.randomBytes(16).toString('hex')}`;
  const title = isGrandTest
    ? `Grand Test · ${examCategory === 'All' ? 'Comprehensive' : examCategory} Laboratory Medicine`
    : setNumber !== null
      ? `${examCategory === 'All' ? 'Comprehensive' : examCategory} Mock Exam · Set ${setNumber}`
      : `${examCategory === 'All' ? 'Comprehensive' : examCategory} Laboratory Medicine Examination`;
  const startedAt = new Date().toISOString();
  const examUserId = session?.userId || 'usr-guest';

  db.prepare(
    `INSERT INTO active_exams (id, user_id, title, questions_json, started_at, duration_minutes, negative_marking, penalty_per_wrong, is_grand_test, passing_percentage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    examId,
    examUserId,
    title,
    JSON.stringify(preparedQuestions),
    startedAt,
    durationMinutes,
    useNegativeMarking ? 1 : 0,
    useNegativeMarking ? penaltyPerWrong : 0,
    isGrandTest ? 1 : 0,
    passingPercentage
  );

  syncInsertActiveExam({
    id: examId,
    userId: examUserId,
    title,
    questions: preparedQuestions,
    startedAt,
    durationMinutes,
  });

  // Convert questions to public shape using strict allowlist serializer
  const sanitizedQuestions = preparedQuestions.map(toPublicQuestion);

  return res.json({
    success: true,
    examId,
    title,
    durationMinutes,
    negativeMarking: useNegativeMarking,
    penaltyPerWrong: useNegativeMarking ? penaltyPerWrong : 0,
    passingPercentage,
    questions: sanitizedQuestions,
  });
});

// ==================== CEE-UG (MECEE-BL) ENTRANCE MOCK ====================
// A standalone 200-question / 3-hour / −0.25 paper assembled from the CEE-UG pool.
// Uploaded in bulk and drawn directly without requiring subject-by-subject partitioning.
// Deliberately independent of the weekly Grand Test window and leaderboard:
// this is a practice mock a candidate can sit at any time.
app.post('/api/cee-ug/exams/start', examStartLimiter, (req, res) => {
  const shuffleOptions = req.body?.shuffleOptions !== false;
  const rawSetNumber = req.body?.setNumber !== undefined ? parseInt(String(req.body.setNumber), 10) : null;
  const setNumber = Number.isInteger(rawSetNumber) && (rawSetNumber as number) > 0 ? (rawSetNumber as number) : null;

  const rawDuration = parseInt(String(req.body?.durationMinutes), 10);
  let durationMinutes = !Number.isNaN(rawDuration) ? Math.max(5, Math.min(300, rawDuration)) : CEE_UG_DURATION_MINUTES;

  let negativeMarking = req.body?.negativeMarking !== undefined ? (req.body.negativeMarking === true || req.body.negativeMarking === 'true') : true;
  const rawPenalty = req.body?.penaltyPerWrong !== undefined ? parseFloat(String(req.body.penaltyPerWrong)) : NaN;
  let penaltyPerWrong = !Number.isNaN(rawPenalty) && rawPenalty >= 0 ? rawPenalty : CEE_UG_PENALTY_PER_WRONG;
  let passingPercentage = CEE_UG_PASSING_PERCENTAGE;

  if (setNumber !== null) {
    try {
      const dbCfg = db
        .prepare('SELECT * FROM mock_set_configs WHERE syllabus_code = ? AND set_number = ?')
        .get('CEE-UG', setNumber) as any;
      if (dbCfg) {
        if (req.body?.durationMinutes === undefined) durationMinutes = dbCfg.duration_minutes;
        if (req.body?.negativeMarking === undefined) negativeMarking = Boolean(dbCfg.negative_marking);
        if (req.body?.penaltyPerWrong === undefined) penaltyPerWrong = dbCfg.penalty_per_wrong;
        if (dbCfg.passing_percentage) passingPercentage = dbCfg.passing_percentage;
      }
    } catch {}
  }

  const session = getSessionUser(req);
  const allPublished = getAllQuestions().filter((q) => q.status === 'Published');

  // Free tier: one free mock start per user; a subscription unlocks unlimited mocks.
  if (!hasFullAccess(session) && process.env.NODE_ENV !== 'test') {
    const usageKey = usageKeyFor(session, req);
    const mock = consumeMockStart(usageKey);
    if (!mock.allowed) {
      return res.status(402).json({
        success: false,
        code: 'PAYWALL',
        kind: 'mock-quota',
        error: `You have used your ${mock.quota.limit} free mock exam${mock.quota.limit === 1 ? '' : 's'}. Upgrade to unlock unlimited mock exams and the full question bank.`,
        quota: mock.quota,
      });
    }
  }

  // Pull all published questions matching CEE-UG category (or bank questions)
  const pool = allPublished.filter((q) => questionMatchesExamCategory(q.examCategories, 'CEE-UG'));
  let selected: MCQQuestion[];

  if (setNumber !== null) {
    const sortedPool = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    let seed = 0;
    const seedKey = `CEE-UG-Set-${setNumber}`;
    for (let i = 0; i < seedKey.length; i++) {
      seed = ((seed << 5) - seed + seedKey.charCodeAt(i)) | 0;
    }
    const prng = createMulberry32(Math.abs(seed) || setNumber * 7919);
    const shuffledForSet = seededShuffle([...sortedPool], prng);
    selected = shuffledForSet
      .slice(0, Math.max(0, Math.min(CEE_UG_TOTAL_QUESTIONS, sortedPool.length)))
      .map((q) => shuffleQuestionOptions(q, shuffleOptions));
  } else {
    selected = prepareExamQuestions(pool, CEE_UG_TOTAL_QUESTIONS, shuffleOptions);
  }

  if (selected.length === 0) {
    return res.status(409).json({
      success: false,
      error:
        'The CEE-UG question bank is empty. Please upload CEE-UG questions before starting this mock.',
      availableCount: 0,
      requiredCount: CEE_UG_TOTAL_QUESTIONS,
    });
  }

  const examId = `exam-sess-${crypto.randomBytes(16).toString('hex')}`;
  const title = setNumber !== null
    ? `CEE-UG Entrance Mock · Set ${setNumber}`
    : `CEE-UG Entrance Mock · ${selected.length} Questions`;
  const startedAt = new Date().toISOString();
  const examUserId = session?.userId || 'usr-guest';

  db.prepare(
    `INSERT INTO active_exams (id, user_id, title, questions_json, started_at, duration_minutes, negative_marking, penalty_per_wrong, is_grand_test, passing_percentage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    examId,
    examUserId,
    title,
    JSON.stringify(selected),
    startedAt,
    durationMinutes,
    negativeMarking ? 1 : 0,
    negativeMarking ? penaltyPerWrong : 0,
    0,
    CEE_UG_PASSING_PERCENTAGE
  );

  syncInsertActiveExam({
    id: examId,
    userId: examUserId,
    title,
    questions: selected,
    startedAt,
    durationMinutes,
  });

  return res.json({
    success: true,
    examId,
    title,
    examType: 'CEE-UG',
    durationMinutes,
    negativeMarking,
    penaltyPerWrong: negativeMarking ? penaltyPerWrong : 0,
    passingPercentage: CEE_UG_PASSING_PERCENTAGE,
    requestedCount: CEE_UG_TOTAL_QUESTIONS,
    servedCount: selected.length,
    availableCount: pool.length,
    questions: selected.map(toPublicQuestion),
  });
});

app.post('/api/exams/:id/submit', (req, res) => {
  const { userAnswers = {} } = req.body;
  const row = db.prepare('SELECT * FROM active_exams WHERE id = ?').get(req.params.id) as any;

  if (!row) {
    return res.status(404).json({ success: false, error: 'Exam session not found' });
  }

  // SEC-03: Exam session ownership enforcement
  // Authenticated exams require session.userId matching row.user_id; guest exams use unguessable ID
  const session = getSessionUser(req);
  if (row.user_id && row.user_id !== 'usr-guest') {
    if (!session || session.userId !== row.user_id) {
      return res.status(403).json({ success: false, error: 'Unauthorized: you do not own this exam session.' });
    }
  }

  // SEC-05: Server-side elapsed time computation & late submission detection
  // Ignore client timeSpentSeconds; compute from row.started_at, capped at duration_minutes * 60
  const startedAtMs = new Date(row.started_at).getTime();
  const serverElapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  const durationSeconds = (row.duration_minutes || 0) * 60;
  const cappedTimeSpentSeconds = durationSeconds > 0 ? Math.min(serverElapsedSeconds, durationSeconds) : serverElapsedSeconds;
  const isLate = durationSeconds > 0 && serverElapsedSeconds > (durationSeconds + 120);

  let fullQuestions: MCQQuestion[];
  let scoreResult;
  try {
    fullQuestions = JSON.parse(row.questions_json);
    const passingPercentage =
      typeof row.passing_percentage === 'number' && row.passing_percentage > 0
        ? row.passing_percentage
        : 70;
    scoreResult = calculateExamScore(fullQuestions, userAnswers, cappedTimeSpentSeconds, passingPercentage, {
      negativeMarking: Boolean(row.negative_marking),
      penaltyPerWrong:
        typeof row.penalty_per_wrong === 'number' ? row.penalty_per_wrong : DEFAULT_PENALTY_PER_WRONG,
    });
  } catch (err) {
    console.error('[Exam Scoring Error]', err);
    return res.status(500).json({ success: false, error: 'Failed to score exam.' });
  }

  // Persist the attempt for the leaderboard (authenticated, email-verified candidates only unless verification not required)
  if (session?.role === 'student' && session.userId && (!emailVerificationRequired || session.emailVerified !== false)) {
    let rankedGrandTest = false;
    if (Boolean(row.is_grand_test) && !isLate) {
      // Check if user already has a completed ranked attempt in this weekly window
      const now = new Date();
      const windowStart = getLeaderboardWindowStart(now).toISOString();
      const priorAttempt = db
        .prepare(
          'SELECT id FROM exam_attempts WHERE user_id = ? AND is_grand_test = 1 AND completed_at >= ?'
        )
        .get(session.userId, windowStart);
      rankedGrandTest = !priorAttempt;
    }

    try {
      db.prepare(
        `INSERT INTO exam_attempts
         (id, user_id, display_name, title, total, correct_count, score, percentage, passed, time_spent_seconds, negative_marking, is_grand_test, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        `attempt-${crypto.randomBytes(12).toString('hex')}`,
        session.userId,
        session.displayName || session.username,
        row.title,
        scoreResult.total,
        scoreResult.correctCount,
        scoreResult.score,
        scoreResult.percentage,
        scoreResult.passed ? 1 : 0,
        scoreResult.timeSpentSeconds,
        scoreResult.negativeMarking ? 1 : 0,
        rankedGrandTest ? 1 : 0,
        new Date().toISOString()
      );
    } catch (err) {
      console.warn('[Leaderboard] Failed to record attempt', err);
    }
  }

  // Clean up active session only after grading succeeds
  db.prepare('DELETE FROM active_exams WHERE id = ?').run(req.params.id);
  syncDeleteActiveExam(req.params.id);

  return res.json({
    success: true,
    result: scoreResult,
    gradedQuestions: fullQuestions.map(toGradedExamQuestion), // Strips admin metadata, safe to reveal answers & explanations
    late: isLate,
  });
});

// ==================== WEEKLY GRAND TEST LEADERBOARD ====================
app.get('/api/leaderboard', (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required to view leaderboard.' });
  }

  const rawLimit = parseInt(String(req.query.limit ?? '25'), 10);
  const limit = Number.isNaN(rawLimit) ? 25 : Math.max(1, Math.min(100, rawLimit));

  const now = new Date();
  const window = getGrandTestWindow(now);
  const windowStart = getLeaderboardWindowStart(now);

  let bestRows: any[] = [];
  try {
    bestRows = db
      .prepare(
        `WITH ranked AS (
           SELECT ea.*,
             COALESCE(u.display_name, ea.display_name) AS current_display_name,
             COALESCE(u.leaderboard_hidden, 0) AS is_hidden,
             ROW_NUMBER() OVER (
               PARTITION BY ea.user_id
               ORDER BY ea.percentage DESC, ea.correct_count DESC, ea.time_spent_seconds ASC, ea.completed_at ASC
             ) AS rn
           FROM exam_attempts ea
           LEFT JOIN users u ON u.id = ea.user_id
           WHERE ea.is_grand_test = 1 AND ea.completed_at >= ?
             AND ea.user_id NOT IN (
               SELECT id FROM users WHERE role IN ('admin', 'superadmin')
             )
         )
         SELECT * FROM ranked WHERE rn = 1
         ORDER BY percentage DESC, correct_count DESC, time_spent_seconds ASC, completed_at ASC`
      )
      .all(windowStart.toISOString()) as any[];
  } catch (err) {
    console.error('[Leaderboard] Query failed', err);
  }

  const mapRow = (row: any, rank: number) => ({
    rank,
    displayName: row.current_display_name || row.display_name,
    percentage: row.percentage,
    correctCount: row.correct_count,
    total: row.total,
    timeSpentSeconds: row.time_spent_seconds,
    negativeMarking: Boolean(row.negative_marking),
    completedAt: row.completed_at,
    isCurrentUser: Boolean(session && row.user_id === session.userId),
  });

  const publicRows = bestRows.filter((r) => !r.is_hidden);
  const totalParticipants = publicRows.length;
  const entries = publicRows.slice(0, limit).map((row, index) => mapRow(row, index + 1));

  let me = null;
  const myIndex = bestRows.findIndex((row) => row.user_id === session.userId);
  if (myIndex >= 0) {
    const myRow = bestRows[myIndex];
    let myRank = publicRows.findIndex((row) => row.user_id === session.userId) + 1;
    if (myRank === 0) {
      myRank = myIndex + 1;
    }
    me = {
      ...mapRow(myRow, myRank),
      percentile: Math.max(1, Math.round(((bestRows.length - myIndex) / bestRows.length) * 100)),
      hidden: Boolean(myRow.is_hidden),
    };
  }

  return res.json({
    success: true,
    window: {
      isOpen: window.isOpen,
      opensAt: window.opensAt.toISOString(),
      closesAt: window.closesAt.toISOString(),
    },
    windowStart: windowStart.toISOString(),
    totalParticipants,
    entries,
    me,
  });
});

// ==================== PDF INGESTION & SOURCE TRACEABILITY APIs ====================
app.get('/api/pdfs', requireAdmin, (_req, res) => {
  return res.json(listSourcePdfs());
});

app.get('/api/pdfs/:filename', requireAdmin, (req, res) => {
  const doc = getSourcePdf(req.params.filename);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Source document not found in repository' });
  }
  return res.json({ success: true, document: doc, ...doc });
});

app.post('/api/extract-pdf', requireAdmin, async (req, res) => {
  try {
    const {
      textContent,
      filename = 'document.pdf',
    } = req.body;
    const pdfBase64 = req.body.pdfBase64 || req.body.base64Data || req.body.base64 || '';
    const existingQuestions = Array.isArray(req.body.existingQuestions)
      ? req.body.existingQuestions
      : getAllQuestions(true);

    // Extract selectable text from binary PDF buffer when pdfBase64 is uploaded
    const resolvedTextContent =
      textContent || (pdfBase64 ? extractTextFromPdfBuffer(Buffer.from(pdfBase64, 'base64')) : '');

    // Preserve the original PDF / text in SQLite for source traceability (Section 1.C of app.pdf)
    saveSourcePdf(
      filename,
      pdfBase64 ? 'application/pdf' : 'text/plain',
      pdfBase64,
      resolvedTextContent
    );

    // 1. Deterministic rule-based parsing first (fast, offline, preserves answer keys & tables exactly)
    const ruleDrafts = parseRawMCQText(resolvedTextContent, filename, existingQuestions);
    const ruleCompleteCount = ruleDrafts.filter(
      (d) => d.options.length >= 4 && Boolean(d.correctAnswer)
    ).length;
    const ruleEngineIsReliable =
      ruleDrafts.length > 0 && ruleCompleteCount / ruleDrafts.length >= 0.6;

    if (ruleEngineIsReliable || !ai || (!pdfBase64 && !resolvedTextContent)) {
      // If some drafts are missing answer keys or explanations, and OCR client is available, fill them in
      if (ai && ruleDrafts.some((d) => !d.correctAnswer || !d.explanation || d.explanation.length < 15)) {
        try {
          const incompleteIndices = ruleDrafts
            .map((d, idx) => ({ d, idx }))
            .filter(({ d }) => !d.correctAnswer || !d.explanation || d.explanation.length < 15);

          if (incompleteIndices.length > 0 && incompleteIndices.length <= 25) {
            const prompt = `You are an expert laboratory medicine board exam contributor.
For each question below, determine the correct answer option letter ('A', 'B', 'C', 'D', or 'E') and provide a clear, scientific clinical explanation.

Questions:
${JSON.stringify(
  incompleteIndices.map(({ d, idx }) => ({
    index: idx,
    questionText: d.questionText,
    options: d.options,
  })),
  null,
  2
)}

Return ONLY a JSON array with this exact structure:
[
  { "index": number, "correctAnswer": "A", "explanation": "Scientific rationale..." }
]`;

          const callAiWithFallback = async (modelContents: any[]) => {
            const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-pro-latest'];
            for (const m of models) {
              try {
                const r = await ai.models.generateContent({
                  model: m,
                  contents: modelContents,
                  config: { responseMimeType: 'application/json' },
                });
                if (r.text) return r.text;
              } catch (err: any) {
                console.warn(`[OCR Fallback] Model ${m} failed: ${err.message || err.status}`);
              }
            }
            return null;
          };

          const aiReply = await callAiWithFallback([{ text: prompt }]);
          if (aiReply) {
            const cleanJson = aiReply.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                const target = ruleDrafts[item.index];
                if (target) {
                  if (!target.correctAnswer && item.correctAnswer) {
                    target.correctAnswer = item.correctAnswer.toUpperCase().slice(0, 1) as any;
                  }
                  if ((!target.explanation || target.explanation.length < 15) && item.explanation) {
                    target.explanation = item.explanation;
                  }
                  target.validationErrors = validateExtractedQuestion(target);
                }
              }
            }
          }
        }
      } catch (aiFillErr) {
          console.warn('AI answer completion error:', aiFillErr);
        }
      }

      saveStagingDrafts('default-staging', filename, ruleDrafts);
      return res.json({
        success: true,
        count: ruleDrafts.length,
        method: 'rule-engine',
        extractedText: resolvedTextContent,
        drafts: ruleDrafts,
      });
    }

    // 2. OCR fallback for scanned / image-only / unusually formatted PDFs the rule engine cannot structure
    if (ai) {
      try {
        const prompt = `You are a medical pathology and laboratory medicine board examination extractor.
Extract all multiple choice questions (MCQs) from this laboratory medicine document into a strict JSON array.
Each question MUST have this JSON structure:
{
  "questionText": "Clear question stem with clinical case scenario or lab parameters",
  "options": [
    { "id": "A", "text": "Option text" },
    { "id": "B", "text": "Option text" },
    { "id": "C", "text": "Option text" },
    { "id": "D", "text": "Option text" }
  ],
  "correctAnswer": "A",
  "explanation": "Detailed scientific and clinical explanation explaining why the answer is correct",
  "reference": "Authoritative medical textbook or CLSI reference citation",
  "clinicalCase": "Patient case presentation if present, or null",
  "unit": "One of: Clinical Chemistry, Hematology & Hemostasis, Clinical Microbiology & Parasitology, Immunology & Serology, Immunohematology (Blood Banking), Urinalysis & Body Fluids, Molecular Diagnostics, Laboratory Operations & QA",
  "subject": "Medical subject name",
  "topic": "Specific diagnostic topic",
  "subtopic": "Specific subtopic if applicable",
  "difficulty": "One of: Memory-based, Conceptual, Advanced",
  "examCategories": []
}
"examCategories" is optional metadata: return [] for General questions. Only list boards (e.g. ["ASCP", "NHPC"]) when the source document explicitly identifies them.
Return ONLY valid raw JSON with NO markdown backticks or commentary.`;

        let contents: any[] = [];
        if (pdfBase64) {
          contents = [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64,
              },
            },
            { text: prompt },
          ];
        } else {
          contents = [{ text: `${prompt}\n\nDocument text content:\n${resolvedTextContent}` }];
        }

        const callAiModel = async (modelContents: any[]) => {
          const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-pro-latest'];
          for (const m of models) {
            try {
              const r = await ai.models.generateContent({
                model: m,
                contents: modelContents,
                config: { responseMimeType: 'application/json' },
              });
              if (r.text) return r.text;
            } catch (err: any) {
              console.warn(`[OCR Fallback] Model ${m} failed: ${err.message || err.status}`);
            }
          }
          return null;
        };

        const rawReply = (await callAiModel(contents)) || '';
        const cleanJson = rawReply.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        const parsedJson = JSON.parse(cleanJson);
        const parsedArray: any[] = Array.isArray(parsedJson)
          ? parsedJson
          : Array.isArray(parsedJson?.questions)
            ? parsedJson.questions
            : [];

        if (parsedArray.length > ruleDrafts.length) {
          const stagedDrafts: ExtractedMCQDraft[] = parsedArray.map((item, idx) => {
            const rawExplanation = String(item.explanation || '').trim();
            const normalizedOptions = (Array.isArray(item.options) ? item.options : [])
              .map((o: any, oIdx: number) => ({
                id: String(o?.id || 'ABCDE'[oIdx] || '').trim().toUpperCase().replace(/[^A-E]/g, '') || 'ABCDE'[oIdx],
                text: String(o?.text || '').trim(),
              }))
              .filter((o: { id: string; text: string }) => o.id && o.text);
            const normalizedAnswer = String(item.correctAnswer || '').trim().toUpperCase().replace(/[^A-E]/g, '').slice(0, 1);
            const draft: ExtractedMCQDraft = {
              id: `ocr-${Date.now()}-${idx + 1}`,
              tempCode: `EXT-${String(idx + 1).padStart(4, '0')}`,
              questionText: String(item.questionText || '').trim(),
              options: normalizedOptions,
              correctAnswer: normalizedAnswer as ExtractedMCQDraft['correctAnswer'],
              explanation: rawExplanation,
              reference: item.reference || `Extracted from ${filename}`,
              clinicalCase: item.clinicalCase || undefined,
              unit: item.unit || 'Clinical Chemistry',
              subject: item.subject || 'Clinical Enzymology & Hepatic Function',
              topic: item.topic || 'Transaminases (ALT/AST)',
              subtopic: item.subtopic || undefined,
              difficulty: item.difficulty || 'Conceptual',
              examCategories: normalizeExamCategories(item.examCategories),
              sourceDocument: filename,
              confidenceScore: rawExplanation ? 0.96 : 0.8,
              validationErrors: [],
              selectedForImport: true,
              status: 'Staged',
            };

            draft.validationErrors = validateExtractedQuestion(draft);
            const dup = findDuplicateQuestion(draft.questionText, existingQuestions);
            if (dup) {
              draft.duplicateWarning = dup;
              draft.validationErrors.push(`Duplicate check: Matches ${dup.existingCode} (${Math.round(dup.similarityScore * 100)}%)`);
            }
            return draft;
          });

          saveStagingDrafts('default-staging', filename, stagedDrafts);

          return res.json({
            success: true,
            count: stagedDrafts.length,
            method: 'cloud-ocr',
            extractedText: resolvedTextContent,
            drafts: stagedDrafts,
          });
        }
      } catch (ocrError) {
        console.warn('OCR extraction fallback:', ocrError);
      }
    }

    // Fallback: rule-based drafts (cloud OCR unavailable, failed, or produced fewer questions)
    saveStagingDrafts('default-staging', filename, ruleDrafts);

    return res.json({
      success: true,
      count: ruleDrafts.length,
      method: 'rule-engine',
      extractedText: resolvedTextContent,
      drafts: ruleDrafts,
    });
  } catch (error: any) {
    console.error('Extraction error:', error);
    res.status(500).json({ success: false, error: 'AI extraction failed. Check server logs.' });
  }
});

app.get('/api/staging', requireAdmin, (_req, res) => {
  const latest = getLatestStagingDrafts();
  return res.json(latest || { drafts: [] });
});

app.post('/api/staging', requireAdmin, (req, res) => {
  const { id = 'default-staging', sourceFilename = 'document.pdf', drafts = [] } = req.body;
  saveStagingDrafts(id, sourceFilename, Array.isArray(drafts) ? drafts : []);
  return res.json({ success: true });
});

app.delete('/api/staging', requireAdmin, (_req, res) => {
  clearStagingDrafts('default-staging');
  return res.json({ success: true });
});

app.get('/api/staging-drafts', requireAdmin, (_req, res) => {
  return res.json({ success: true, staging: getLatestStagingDrafts() });
});

app.delete('/api/staging-drafts', requireAdmin, (_req, res) => {
  clearStagingDrafts('default-staging');
  return res.json({ success: true });
});

// ==================== QUESTION ERROR REPORTING APIs ====================
app.post('/api/report-question', reportQuestionLimiter, (req, res) => {
  const { questionId, questionCode, reason, details } = req.body;
  const session = getSessionUser(req);
  const report: QuestionReport = {
    id: `rep-${Date.now()}`,
    questionId,
    questionCode,
    reason: reason || 'Incorrect Answer',
    details: details || '',
    submittedAt: new Date().toISOString(),
    status: 'Pending',
    userId: session?.userId || null,
  };
  insertReport(report);
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin';
  res.json({
    success: true,
    report,
    reports: isAdmin ? getAllReports() : undefined,
  });
});

app.get('/api/reports', requireAdmin, (_req, res) => {
  res.json({ success: true, reports: getAllReports() });
});

app.patch('/api/reports/:id', requireAdmin, (req, res) => {
  const status = req.body?.status;
  const validStatus: 'Pending' | 'Investigating' | 'Resolved' =
    status === 'Pending' || status === 'Investigating' ? status : 'Resolved';
  updateReportStatus(req.params.id, validStatus);
  res.json({ success: true, reports: getAllReports() });
});

app.patch('/api/reports/:id/resolve', requireAdmin, (req, res) => {
  const status = req.body?.status;
  const validStatus: 'Pending' | 'Investigating' | 'Resolved' =
    status === 'Pending' || status === 'Investigating' ? status : 'Resolved';
  updateReportStatus(req.params.id, validStatus);
  res.json({ success: true, reports: getAllReports() });
});

// ==================== DATABASE BACKUP & RECOVERY APIs ====================
app.get('/api/backup/export', requireAdmin, (req, res) => {
  res.json({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    questions: getAllQuestions(true),
    categories: getAllCategories(),
    reports: getAllReports(),
  });
});

app.post('/api/backup/restore', requireSuperAdmin, (req, res) => {
  const { questions, categories, reports, ...rest } = req.body || {};
  if (Object.keys(rest).length > 0) {
    return res.status(400).json({ success: false, error: 'Unknown fields in backup restore payload.' });
  }
  if (questions !== undefined && !Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: 'questions must be an array' });
  }
  if (categories !== undefined && !Array.isArray(categories)) {
    return res.status(400).json({ success: false, error: 'categories must be an array' });
  }
  if (reports !== undefined && !Array.isArray(reports)) {
    return res.status(400).json({ success: false, error: 'reports must be an array' });
  }

  if (Array.isArray(questions)) {
    for (const q of questions) {
      const err = validateQuestionPayload(q);
      if (err) {
        return res.status(400).json({ success: false, error: err });
      }
    }
  }

  try {
    restoreBackup({ questions, categories, reports });
  } catch (err) {
    console.error('[Backup Restore Error]', err);
    return res.status(500).json({ success: false, error: 'Database transaction error during restore.' });
  }

  res.json({
    success: true,
    questions: getAllQuestions(true),
    categories: getAllCategories(),
    reports: getAllReports(),
  });
});

// ==================== SEO: ROBOTS.TXT & SITEMAP.XML ====================
export const PUBLIC_SITEMAP_ROUTES = [
  '/',
  '/browse',
  '/practice',
  '/exam',
  '/cee-ug',
  '/pricing',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/cookies',
  '/help',
  '/contact',
];

app.get('/robots.txt', (req, res) => {
  const rawSiteUrl = process.env.SITE_URL?.trim();
  const baseUrl = (rawSiteUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /api/',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
  res.type('text/plain');
  res.send(robotsTxt);
});

app.get('/sitemap.xml', (req, res) => {
  const rawSiteUrl = process.env.SITE_URL?.trim();
  const baseUrl = (rawSiteUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const lastMod = new Date().toISOString().split('T')[0];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_SITEMAP_ROUTES.map((route) => {
      const loc = route === '/' ? `${baseUrl}/` : `${baseUrl}${route}`;
      const priority = route === '/' ? '1.0' : route === '/practice' || route === '/exam' ? '0.8' : '0.6';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    }),
    '</urlset>',
  ].join('\n');

  res.type('application/xml');
  res.send(xml);
});

// 404 handler for unmatched /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.path} not found`,
  });
});

// Final Express error middleware (never leaks stack traces outside development)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status =
    typeof err.status === 'number'
      ? err.status
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;

  console.error(`[Server Error] ${req.method} ${req.url} - ${status}:`, err);

  if (res.headersSent) {
    return next(err);
  }

  if (status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large',
    });
  }

  if (err instanceof SyntaxError && status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload',
    });
  }

  const message =
    process.env.NODE_ENV === 'development'
      ? err.message || 'Internal server error'
      : 'Internal server error';

  return res.status(status).json({
    success: false,
    error: message,
  });
});

// Process-level failure handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  process.exit(1);
});

// ============================================================================
// KNOWN CLIENT SPA ROUTES
// NOTE TO DEVELOPER: When adding new top-level client routes to App.tsx,
// you MUST add them to this KNOWN_CLIENT_ROUTES list so the production server
// serves index.html with HTTP 200. Any other route receives HTTP 404 with
// index.html so React Router renders the NotFound page with an accurate HTTP status.
// ============================================================================
export const KNOWN_CLIENT_ROUTES = [
  '/',
  '/home',
  '/browse',
  '/practice',
  '/exam',
  '/cee-ug',
  '/mistakes',
  '/leaderboard',
  '/bookmarks',
  '/dashboard',
  '/pricing',
  '/payment', // includes /payment/result
  '/help',
  '/cookies',
  '/verify-email',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/contact',
  '/admin', // includes /admin and anything under it (/admin/*)
];

export function isKnownClientRoute(pathname: string): boolean {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return KNOWN_CLIENT_ROUTES.some((route) => {
    if (route === '/') return clean === '/';
    return clean === route || clean.startsWith(`${route}/`);
  });
}

async function startServer() {
  await hydrateFromSupabase();
  // Ensure the taxonomy contains only medical laboratory units.
  cleanupCeeUgTaxonomy();
  await bootstrapSuperAdmin();
  // Enforce the invariant that staff/superadmin accounts never retain candidate
  // study progress, bookmarks, analytics, or leaderboard attempts.
  purgeStaffStudyData();

  // Keep Supabase Free Tier active & automatically purge expired temporary rows every 6 hours
  setInterval(() => {
    cleanupExpiredData();
    if (isSupabaseConfigured()) {
      void pingSupabaseKeepAlive().catch((err) => console.warn('[KeepAlive Error]', err));
    }
  }, 6 * 60 * 60 * 1000);

  if (process.env.NODE_ENV === 'development') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    // Rewrite host header so Vite dev middleware never blocks external tunnel URLs
    app.use((req, _res, next) => {
      req.headers.host = `localhost:${PORT}`;
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.resolve(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error(`[Fatal Error] Production bundle not found at: ${distPath}`);
      console.error('Please run "npm run build" before starting the server in production mode.');
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const isKnown = isKnownClientRoute(req.path);
      if (!isKnown) {
        res.status(404);
      }
      res.sendFile(indexPath);
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Prayogshala Academy server running on http://0.0.0.0:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SITE_URL?.trim()) {
        console.warn(
          '[Config Warning] SITE_URL is unset in production. Robots.txt and sitemap.xml will fall back to incoming request host headers.'
        );
      }
      if (!process.env.RESEND_API_KEY?.trim()) {
        console.warn(
          '================================================================================\n' +
          '[Config Warning] RESEND_API_KEY is not configured in production.\n' +
          'Password resets and staff invitation emails will run in mock mode and will not\n' +
          'be delivered to users. Set RESEND_API_KEY to enable real transactional delivery.\n' +
          '================================================================================'
        );
      }
    }
    startBackupScheduler();
  });

  let isShuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);

    stopBackupScheduler();

    const forceTimer = setTimeout(() => {
      console.error('[Process] Forceful shutdown timeout exceeded (10s). Terminating.');
      process.exit(1);
    }, 10000);
    forceTimer.unref();

    server.closeIdleConnections?.();
    server.closeAllConnections?.();

    server.close((err) => {
      if (err) {
        console.error('[Process] Error closing HTTP server:', err);
      } else {
        console.log('[Process] HTTP server closed to new connections.');
      }

      try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
        db.close();
        console.log('[Process] SQLite database checkpointed and closed cleanly.');
      } catch (dbErr) {
        console.error('[Process] Error closing SQLite database:', dbErr);
      }

      clearTimeout(forceTimer);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
