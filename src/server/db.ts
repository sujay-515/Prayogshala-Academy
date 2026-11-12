import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'node:util';
import { INITIAL_CATEGORIES } from '../data/categories';
import { MCQQuestion, UnitCategory, UserStats, QuestionReport, QuestionStatus } from '../types';
import { questionMatchesExamCategory } from '../utils/examCategories';
import {
  isSupabaseConfigured,
  supabaseRequest,
  syncUpsertQuestion,
  syncBulkQuestions,
  syncDeleteQuestion,
  syncBulkDeleteQuestions,
  syncSaveCategories,
  syncInsertReport,
  syncUpdateReportStatus,
  syncUpsertUser,
  syncPatchUser,
  syncUpdateUserRole,
  syncUpdateUserStats,
  syncDeleteUserSessions,
  syncUpdateUserSessionRole,
  syncUpsertPasswordReset,
  syncDeletePasswordReset,
  syncDeleteUserPasswordResets,
  syncDeleteUserActiveExams,
  syncInsertExamAttempt,
  syncDeleteUserExamAttempts,
  syncSaveSourcePdf,
  syncSaveStagingDrafts,
  syncDeleteStagingDrafts,
  syncCleanupExpiredRecords,
  logSupabaseDisabledOnce,
} from './supabaseSync';

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'prayogshala_academy.sqlite');
export const db = new DatabaseSync(DB_PATH);

// Configure WAL mode for concurrent reads/writes and performance up to 10,000+ MCQs
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    unit TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit);
  CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
  CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
  CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
  CREATE INDEX IF NOT EXISTS idx_questions_code ON questions(code);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    question_code TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT NOT NULL,
    stats_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS source_pdfs (
    filename TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    base64_data TEXT,
    text_content TEXT,
    uploaded_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS active_exams (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    started_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pdf_staging_drafts (
    id TEXT PRIMARY KEY,
    source_filename TEXT NOT NULL,
    drafts_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    title TEXT NOT NULL,
    total INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    score REAL NOT NULL,
    percentage INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    time_spent_seconds INTEGER NOT NULL,
    negative_marking INTEGER NOT NULL DEFAULT 0,
    is_grand_test INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_exam_attempts_window
    ON exam_attempts(is_grand_test, completed_at);

  CREATE TABLE IF NOT EXISTS weekly_papers (
    window_start TEXT PRIMARY KEY,
    question_ids_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price_npr INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NPR',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_user
    ON subscriptions(user_id, status, expires_at);

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    gateway TEXT NOT NULL,
    amount_npr INTEGER NOT NULL,
    status TEXT NOT NULL,
    gateway_ref TEXT,
    gateway_payload TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway, gateway_ref);

  CREATE TABLE IF NOT EXISTS practice_usage (
    usage_key TEXT NOT NULL,
    unit TEXT NOT NULL,
    question_id TEXT NOT NULL,
    first_answered_at TEXT NOT NULL,
    PRIMARY KEY (usage_key, unit, question_id)
  );

  CREATE TABLE IF NOT EXISTS exam_usage (
    usage_key TEXT PRIMARY KEY,
    free_mock_used INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mock_set_configs (
    syllabus_code TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    negative_marking INTEGER NOT NULL DEFAULT 1,
    penalty_per_wrong REAL NOT NULL DEFAULT 0.25,
    passing_percentage REAL NOT NULL DEFAULT 70,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (syllabus_code, set_number)
  );
`);

// Safe migrations for email support & password resets
try {
  db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
} catch {}

try {
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL').run();
} catch {}

try {
  db.prepare('ALTER TABLE reports ADD COLUMN user_id TEXT').run();
} catch {}

// Exam policy is fixed at session start so grading cannot be altered by the client
try {
  db.prepare('ALTER TABLE active_exams ADD COLUMN negative_marking INTEGER NOT NULL DEFAULT 0').run();
} catch {}

try {
  db.prepare('ALTER TABLE active_exams ADD COLUMN penalty_per_wrong REAL NOT NULL DEFAULT 0.25').run();
} catch {}

try {
  db.prepare('ALTER TABLE active_exams ADD COLUMN is_grand_test INTEGER NOT NULL DEFAULT 0').run();
} catch {}

// Pass mark is fixed at session start too (CEE-UG uses 50%, licensing boards 70%)
try {
  db.prepare('ALTER TABLE active_exams ADD COLUMN passing_percentage INTEGER NOT NULL DEFAULT 70').run();
} catch {}

// Session metadata for the device list
try {
  db.prepare('ALTER TABLE sessions ADD COLUMN user_agent TEXT').run();
} catch {}

try {
  db.prepare('ALTER TABLE sessions ADD COLUMN ip TEXT').run();
} catch {}

// Email ownership verification (existing accounts default to verified so the
// migration cannot lock anyone out).
try {
  db.prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1').run();
} catch {}

try {
  db.prepare('ALTER TABLE users ADD COLUMN email_verify_token_hash TEXT').run();
} catch {}

try {
  db.prepare('ALTER TABLE users ADD COLUMN email_verify_expires TEXT').run();
} catch {}

try {
  db.prepare('ALTER TABLE users ADD COLUMN leaderboard_hidden INTEGER NOT NULL DEFAULT 0').run();
} catch {}

const scryptAsync = promisify(crypto.scrypt);

export async function hashPassword(password: string, customSalt?: string): Promise<string> {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, keyHex] = storedHash.split(':');
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  }
  // Legacy static-salt compatibility
  const legacyDerived = (await scryptAsync(password, 'prayogshala_salt_2026', 64)) as Buffer;
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (legacyDerived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(legacyDerived, storedBuf);
}

export const DEFAULT_USER_STATS: UserStats = {
  totalAnswered: 0,
  totalCorrect: 0,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().slice(0, 10),
  bookmarkedIds: [],
  bookmarkMeta: {},
  revisionQueueIds: [],
  mistakeStreaks: {},
  subjectPerformance: {},
  topicPerformance: {},
  examRecords: [],
};

async function seedDemoData() {
  const existingDemo = db.prepare("SELECT id FROM users WHERE username = 'demo_student'").get();
  if (!existingDemo) {
    const now = new Date().toISOString();
    const demoPasswordHash = await hashPassword('StudentDemo123!');
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, display_name, stats_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'usr-demo-student',
      'demo_student',
      'demo.student@prayogshala.test',
      demoPasswordHash,
      'student',
      'Demo Medical Student',
      JSON.stringify(DEFAULT_USER_STATS),
      now
    );
  }
}

// Seed initial taxonomy categories if needed (no default user accounts seeded)
function seedDatabaseIfNeeded() {
  const existingRows = db.prepare('SELECT id FROM categories').all() as { id: string }[];
  const existingIds = new Set(existingRows.map((r) => r.id));

  // If categories are empty or only the legacy 8 units with legacy IDs, upgrade to modern 15 subjects
  const isLegacyOnly = existingRows.length <= 8 && existingRows.every((r) => r.id.startsWith('unit-'));
  if (isLegacyOnly) {
    db.prepare('DELETE FROM categories').run();
    existingIds.clear();
  }

  const insertC = db.prepare('INSERT INTO categories (id, sort_order, data_json) VALUES (?, ?, ?)');
  INITIAL_CATEGORIES.forEach((cat, idx) => {
    if (!existingIds.has(cat.id)) {
      insertC.run(cat.id, idx, JSON.stringify(cat));
    }
  });

  // Seed default subscription plans if the catalog is empty (prices in whole NPR)
  const pCountRow = db.prepare('SELECT COUNT(*) as cnt FROM plans').get() as { cnt: number };
  if (pCountRow.cnt === 0) {
    const insertP = db.prepare(
      'INSERT INTO plans (id, name, duration_days, price_npr, currency, is_active, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)'
    );
    insertP.run('plan-1m', '1 Month Full Access', 30, 500, 'NPR', 0);
    insertP.run('plan-3m', '3 Months Full Access', 90, 1200, 'NPR', 1);
    insertP.run('plan-6m', '6 Months Full Access', 180, 2000, 'NPR', 2);
  }

  // Optional demo data seeding strictly in development mode when explicitly requested
  if (process.env.SEED_DEMO_DATA === 'true' && process.env.NODE_ENV === 'development') {
    void seedDemoData().catch((err) => console.error('Failed to seed demo data:', err));
  }

  // Migrate any inverted unit/subject taxonomies in database
  migrateUnitSubjectInversion();
}

/**
 * One-time migration to swap inverted unit and subject fields:
 * - Subject is the top-level specialty discipline (e.g. Clinical Chemistry)
 * - Unit is the section/module within the subject (e.g. Clinical Enzymology & Hepatic Function)
 */
export function migrateUnitSubjectInversion(): void {
  try {
    const knownSubjectNames = new Set([
      'clinical chemistry',
      'hematology & hemostasis',
      'hematology',
      'clinical microbiology & parasitology',
      'microbiology',
      'immunology & serology',
      'immunology',
      'immunohematology (blood banking)',
      'blood banking',
      'urinalysis & body fluids',
      'molecular diagnostics',
      'laboratory operations & qa',
      'chemistry',
    ]);

    // Check categories in db as well
    const catRows = db.prepare('SELECT id, data_json FROM categories').all() as { id: string; data_json: string }[];
    const updateCatStmt = db.prepare('UPDATE categories SET data_json = ? WHERE id = ?');

    for (const catRow of catRows) {
      try {
        const catData = JSON.parse(catRow.data_json);
        if (catData.name) {
          knownSubjectNames.add(catData.name.trim().toLowerCase());
        }
        let changed = false;
        // Ensure units is populated from subjects
        if (Array.isArray(catData.subjects) && (!catData.units || catData.units.length === 0)) {
          catData.units = catData.subjects;
          changed = true;
        } else if (Array.isArray(catData.units) && (!catData.subjects || catData.subjects.length === 0)) {
          catData.subjects = catData.units;
          changed = true;
        }
        // Ensure icon is assigned
        if (!catData.icon) {
          const initMatch = INITIAL_CATEGORIES.find(
            (ic) => ic.name.toLowerCase() === catData.name?.toLowerCase()
          );
          if (initMatch?.icon) {
            catData.icon = initMatch.icon;
            changed = true;
          }
        }
        if (changed) {
          updateCatStmt.run(JSON.stringify(catData), catRow.id);
        }
      } catch {
        // ignore parse error
      }
    }

    const rows = db.prepare('SELECT id, unit, subject, data_json FROM questions').all() as any[];
    const updateStmt = db.prepare(`
      UPDATE questions 
      SET unit = ?, subject = ?, data_json = ? 
      WHERE id = ?
    `);

    let swappedCount = 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const row of rows) {
        const currentUnitLower = (row.unit || '').trim().toLowerCase();
        // If current unit is a known subject name, they are inverted!
        if (knownSubjectNames.has(currentUnitLower)) {
          const newSubject = row.unit;
          const newUnit = row.subject;

          let data: any = {};
          try {
            data = JSON.parse(row.data_json);
          } catch {
            data = {};
          }
          data.subject = newSubject;
          data.unit = newUnit;

          updateStmt.run(newUnit, newSubject, JSON.stringify(data), row.id);
          swappedCount++;
        }
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    if (swappedCount > 0) {
      console.log(`[Taxonomy Migration] Swapped inverted unit/subject for ${swappedCount} questions.`);
    }
  } catch (err) {
    console.warn('[Taxonomy Migration] Error verifying unit/subject taxonomy:', err);
  }
}

seedDatabaseIfNeeded();

/**
 * Cleans up any CEE-UG entrance subjects (Physics, Chemistry, Biology, Mental Ability)
 * that may have been previously added to the taxonomy.
 * CEE-UG is an examination category / mock test only and has no units or subjects.
 */
export function cleanupCeeUgTaxonomy(): void {
  try {
    const existing = getAllCategories();
    const entranceSubjectNames = new Set(['physics', 'chemistry', 'biology', 'mental ability']);
    const filtered = existing.filter(
      (cat) =>
        !cat.id.startsWith('unit-ceeug-') &&
        !entranceSubjectNames.has(cat.name.trim().toLowerCase())
    );

    if (filtered.length !== existing.length) {
      saveAllCategories(filtered);
      console.log(
        `[Taxonomy] Cleaned up CEE-UG entrance subjects: removed ${existing.length - filtered.length} non-lab categories.`
      );
    }
  } catch (err) {
    console.warn('[Taxonomy] Could not clean up CEE-UG taxonomy:', err);
  }
}

export function getUserByEmailOrUsername(identifier: string) {
  const clean = identifier.trim().toLowerCase();
  return db
    .prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?')
    .get(clean, clean) as any;
}

export function listAllUsers() {
  const rows = db.prepare(`
    SELECT id, username, email, role, display_name, created_at, stats_json
    FROM users
    ORDER BY
      CASE role
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END,
      created_at DESC
  `).all() as any[];

  return rows.map((r) => {
    // Study progress is a student-only concept. Staff and superadmin accounts
    // must never expose (or retain) candidate analytics.
    const isStudent = r.role === 'student';
    let parsedStats: any = null;
    if (isStudent) {
      try {
        parsedStats = JSON.parse(r.stats_json);
      } catch {}
    }
    return {
      id: r.id,
      username: r.username,
      email: r.email || null,
      role: r.role,
      displayName: r.display_name,
      createdAt: r.created_at,
      totalAnswered: isStudent ? parsedStats?.totalAnswered || 0 : 0,
      totalCorrect: isStudent ? parsedStats?.totalCorrect || 0 : 0,
    };
  });
}

/**
 * Staff accounts must never accumulate candidate study data. This purges any
 * study progress, bookmarks, analytics, and leaderboard attempts that were
 * recorded before the role restriction existed (or by legacy clients).
 *
 * Safe to call at boot and after a role promotion: it is idempotent and only
 * writes to accounts whose stored stats still contain student activity.
 */
export function purgeStaffStudyData(): void {
  const staffRows = db
    .prepare(
      `SELECT id, username, email, password_hash, role, display_name, created_at, stats_json
       FROM users
       WHERE role IN ('admin', 'superadmin')`
    )
    .all() as any[];

  const emptyStatsJson = JSON.stringify(DEFAULT_USER_STATS);
  const resetStats = db.prepare('UPDATE users SET stats_json = ? WHERE id = ?');

  for (const row of staffRows) {
    let hasProgress = false;
    try {
      const stats = JSON.parse(row.stats_json);
      hasProgress = Boolean(
        stats &&
          ((typeof stats.totalAnswered === 'number' && stats.totalAnswered > 0) ||
            (typeof stats.totalCorrect === 'number' && stats.totalCorrect > 0) ||
            (typeof stats.streakDays === 'number' && stats.streakDays > 0) ||
            (Array.isArray(stats.bookmarkedIds) && stats.bookmarkedIds.length > 0) ||
            (Array.isArray(stats.revisionQueueIds) && stats.revisionQueueIds.length > 0) ||
            (stats.bookmarkMeta && Object.keys(stats.bookmarkMeta).length > 0) ||
            (stats.mistakeStreaks && Object.keys(stats.mistakeStreaks).length > 0) ||
            (stats.subjectPerformance && Object.keys(stats.subjectPerformance).length > 0) ||
            (stats.topicPerformance && Object.keys(stats.topicPerformance).length > 0) ||
            (Array.isArray(stats.examRecords) && stats.examRecords.length > 0))
      );
    } catch {
      // Corrupt/legacy stats payloads are reset as well.
      hasProgress = true;
    }

    if (hasProgress) {
      resetStats.run(emptyStatsJson, row.id);
      syncUpsertUser({
        id: row.id,
        username: row.username,
        email: row.email || undefined,
        password_hash: row.password_hash,
        role: row.role,
        display_name: row.display_name,
        stats_json: emptyStatsJson,
        created_at: row.created_at,
      });
    }
  }

  // Candidate-only activity tables must not retain staff rows either.
  db.prepare(
    `DELETE FROM exam_attempts
     WHERE user_id IN (SELECT id FROM users WHERE role IN ('admin', 'superadmin'))`
  ).run();
  db.prepare(
    `DELETE FROM active_exams
     WHERE user_id IN (SELECT id FROM users WHERE role IN ('admin', 'superadmin'))`
  ).run();
}

export function updateUserRole(userId: string, newRole: 'admin' | 'student') {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { success: false, error: 'User not found' };

  // Protect superadmin from being demoted
  if (user.role === 'superadmin') {
    return { success: false, error: 'Head Administrator role is permanent and cannot be modified.' };
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
  db.prepare('UPDATE sessions SET role = ? WHERE user_id = ?').run(newRole, userId);
  syncUpdateUserRole(userId, newRole);
  syncUpdateUserSessionRole(userId, newRole);

  if (newRole === 'admin') {
    db.prepare('UPDATE users SET stats_json = ? WHERE id = ?').run(JSON.stringify(DEFAULT_USER_STATS), userId);
    db.prepare('DELETE FROM exam_attempts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM active_exams WHERE user_id = ?').run(userId);
    syncUpdateUserStats(userId, DEFAULT_USER_STATS);
    syncDeleteUserExamAttempts(userId);
    syncDeleteUserActiveExams(userId);
  }

  return { success: true };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createEmailVerification(userId: string): string {
  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'UPDATE users SET email_verify_token_hash = ?, email_verify_expires = ? WHERE id = ?'
  ).run(tokenHash, expiresAt, userId);
  syncPatchUser(userId, {
    email_verify_token_hash: tokenHash,
    email_verify_expires: expiresAt,
  });
  return rawToken;
}

export function verifyEmailToken(rawToken: string): { success: boolean; error?: string } {
  const hash = hashToken(rawToken);
  const row = db
    .prepare('SELECT id, email_verify_expires FROM users WHERE email_verify_token_hash = ?')
    .get(hash) as { id: string; email_verify_expires: string | null } | undefined;

  if (!row) {
    return { success: false, error: 'Invalid or already used verification link.' };
  }

  if (!row.email_verify_expires || new Date(row.email_verify_expires).getTime() < Date.now()) {
    db.prepare(
      'UPDATE users SET email_verify_token_hash = NULL, email_verify_expires = NULL WHERE id = ?'
    ).run(row.id);
    syncPatchUser(row.id, {
      email_verify_token_hash: null,
      email_verify_expires: null,
    });
    return { success: false, error: 'Verification link has expired. Request a new one.' };
  }

  db.prepare(
    'UPDATE users SET email_verified = 1, email_verify_token_hash = NULL, email_verify_expires = NULL WHERE id = ?'
  ).run(row.id);
  syncPatchUser(row.id, {
    email_verified: 1,
    email_verify_token_hash: null,
    email_verify_expires: null,
  });
  return { success: true };
}

export function createPasswordReset(userId: string): string {
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
  syncDeleteUserPasswordResets(userId);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour TTL

  db.prepare('INSERT INTO password_resets (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    tokenHash,
    userId,
    expiresAt,
    createdAt
  );
  syncUpsertPasswordReset(tokenHash, userId, expiresAt, createdAt);

  return rawToken;
}

export function verifyAndConsumeResetToken(rawToken: string, newPasswordHash: string): { success: boolean; error?: string } {
  const tokenHash = hashToken(rawToken);
  const row = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(tokenHash) as any;
  if (!row) {
    return { success: false, error: 'Invalid or expired password reset link.' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(tokenHash);
    syncDeletePasswordReset(tokenHash);
    return { success: false, error: 'Password reset link has expired. Please request a new one.' };
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, row.user_id);
    // Completing a reset proves control of the mailbox.
    db.prepare(
      'UPDATE users SET email_verified = 1, email_verify_token_hash = NULL, email_verify_expires = NULL WHERE id = ?'
    ).run(row.user_id);
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(tokenHash);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  syncPatchUser(row.user_id, {
    password_hash: newPasswordHash,
    email_verified: 1,
    email_verify_token_hash: null,
    email_verify_expires: null,
  });
  syncDeletePasswordReset(tokenHash);
  syncDeleteUserSessions(row.user_id);

  return { success: true };
}

// Data Access Helpers
export function getAllQuestions(includeUnpublished = true): MCQQuestion[] {
  const sql = includeUnpublished
    ? 'SELECT data_json FROM questions ORDER BY created_at DESC, code ASC'
    : `SELECT data_json FROM questions WHERE status = 'Published' ORDER BY created_at DESC, code ASC`;
  const rows = db.prepare(sql).all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json));
}

export interface QuestionQueryParams {
  unit?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  status?: string;
  exam?: string;
  search?: string;
  page?: number;
  limit?: number;
  includeUnpublished?: boolean;
}

export function queryQuestions(params: QuestionQueryParams = {}): {
  questions: MCQQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const conditions: string[] = [];
  const args: any[] = [];

  if (!params.includeUnpublished) {
    conditions.push(`status = 'Published'`);
  } else if (params.status && params.status !== 'All') {
    conditions.push(`status = ?`);
    args.push(params.status);
  }

  if (params.unit && params.unit !== 'All') {
    conditions.push(`unit = ?`);
    args.push(params.unit);
  }
  if (params.subject && params.subject !== 'All') {
    conditions.push(`subject = ?`);
    args.push(params.subject);
  }
  if (params.topic && params.topic !== 'All') {
    conditions.push(`topic = ?`);
    args.push(params.topic);
  }
  if (params.difficulty && params.difficulty !== 'All') {
    conditions.push(`difficulty = ?`);
    args.push(params.difficulty);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT data_json FROM questions ${whereClause} ORDER BY created_at DESC, code ASC`)
    .all(...args) as { data_json: string }[];

  let filtered: MCQQuestion[] = rows.map((r) => JSON.parse(r.data_json));

  if (params.exam && params.exam !== 'All') {
    filtered = filtered.filter((q) => questionMatchesExamCategory(q.examCategories, params.exam as any));
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.questionText.toLowerCase().includes(s) ||
        q.code.toLowerCase().includes(s) ||
        q.subject.toLowerCase().includes(s) ||
        (q.unit && q.unit.toLowerCase().includes(s)) ||
        q.topic.toLowerCase().includes(s) ||
        (q.subtopic && q.subtopic.toLowerCase().includes(s)) ||
        q.options.some((o) => o.text.toLowerCase().includes(s))
    );
  }

  const total = filtered.length;
  const page = Math.max(1, params.page || 1);
  const limit = params.limit && params.limit > 0 ? params.limit : total || 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paginated = params.limit ? filtered.slice(offset, offset + limit) : filtered;

  return {
    questions: paginated,
    total,
    page,
    limit,
    totalPages,
  };
}

export function getQuestionById(id: string): MCQQuestion | null {
  const row = db.prepare('SELECT data_json FROM questions WHERE id = ?').get(id) as { data_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data_json);
  } catch {
    return null;
  }
}

export function upsertQuestion(q: MCQQuestion, skipCloudSync = false): void {
  db.prepare(`
    INSERT INTO questions (id, code, unit, subject, topic, subtopic, difficulty, status, created_at, updated_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      unit = excluded.unit,
      subject = excluded.subject,
      topic = excluded.topic,
      subtopic = excluded.subtopic,
      difficulty = excluded.difficulty,
      status = excluded.status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    q.id,
    q.code || '',
    q.unit || '',
    q.subject || '',
    q.topic || '',
    q.subtopic || null,
    q.difficulty || 'Medium',
    q.status || 'Draft',
    q.createdAt || new Date().toISOString(),
    q.updatedAt || new Date().toISOString(),
    JSON.stringify(q)
  );
  if (!skipCloudSync) {
    syncUpsertQuestion(q);
  }
}

export function bulkInsertQuestions(questions: MCQQuestion[]): void {
  if (questions.length === 0) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const q of questions) {
      upsertQuestion(q, true);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  syncBulkQuestions(questions);
}

export function deleteQuestionById(id: string): void {
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  syncDeleteQuestion(id);
}

export function bulkDeleteQuestions(ids: string[]): number {
  if (ids.length === 0) return 0;
  let deleted = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    for (const id of ids) {
      deleted += Number(stmt.run(id).changes || 0);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  syncBulkDeleteQuestions(ids);
  return deleted;
}

export function bulkUpdateQuestionStatus(ids: string[], newStatus: QuestionStatus, author = 'Administrator'): MCQQuestion[] {
  const timestamp = new Date().toISOString();
  const getStmt = db.prepare('SELECT data_json FROM questions WHERE id = ?');
  const updatedQuestions: MCQQuestion[] = [];

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const id of ids) {
      const row = getStmt.get(id) as { data_json: string } | undefined;
      if (row) {
        const q: MCQQuestion = JSON.parse(row.data_json);
        q.status = newStatus;
        q.updatedAt = timestamp;
        q.versionHistory = [
          ...(q.versionHistory || []),
          {
            timestamp,
            author,
            action: `Bulk status update to ${newStatus}`,
          },
        ];
        upsertQuestion(q, true);
        updatedQuestions.push(q);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  if (updatedQuestions.length > 0) {
    syncBulkQuestions(updatedQuestions);
  }
  return getAllQuestions();
}

export function getAllCategories(): UnitCategory[] {
  const rows = db.prepare('SELECT data_json FROM categories ORDER BY sort_order ASC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json));
}

export function saveAllCategories(categories: UnitCategory[], skipCloudSync = false): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM categories');
    const insertC = db.prepare('INSERT INTO categories (id, sort_order, data_json) VALUES (?, ?, ?)');
    categories.forEach((cat, idx) => {
      insertC.run(cat.id, idx, JSON.stringify(cat));
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  if (!skipCloudSync) {
    syncSaveCategories(categories);
  }
}

export function restoreBackup(data: {
  questions?: MCQQuestion[];
  categories?: UnitCategory[];
  reports?: QuestionReport[];
}): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    if (Array.isArray(data.questions)) {
      for (const q of data.questions) {
        upsertQuestion(q, true);
      }
    }
    if (Array.isArray(data.categories)) {
      db.exec('DELETE FROM categories');
      const insertC = db.prepare('INSERT INTO categories (id, sort_order, data_json) VALUES (?, ?, ?)');
      data.categories.forEach((cat, idx) => {
        insertC.run(cat.id, idx, JSON.stringify(cat));
      });
    }
    if (Array.isArray(data.reports)) {
      for (const r of data.reports) {
        insertReport(r, true);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  if (Array.isArray(data.questions)) syncBulkQuestions(data.questions);
  if (Array.isArray(data.categories)) syncSaveCategories(data.categories);
}

export function getAllReports(): QuestionReport[] {
  const rows = db.prepare('SELECT * FROM reports ORDER BY submitted_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    questionId: r.question_id,
    questionCode: r.question_code,
    reason: r.reason,
    details: r.details,
    submittedAt: r.submitted_at,
    status: r.status,
    userId: r.user_id || null,
  }));
}

export function insertReport(report: QuestionReport, skipCloudSync = false): void {
  db.prepare(`
    INSERT INTO reports (id, question_id, question_code, reason, details, submitted_at, status, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      details = excluded.details,
      user_id = excluded.user_id
  `).run(
    report.id,
    report.questionId,
    report.questionCode,
    report.reason,
    report.details,
    report.submittedAt,
    report.status,
    report.userId || null
  );
  if (!skipCloudSync) {
    syncInsertReport(report);
  }
}

export function updateReportStatus(id: string, status: 'Pending' | 'Investigating' | 'Resolved'): void {
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
  syncUpdateReportStatus(id, status);
}

export function getUserStats(userId = 'usr-guest'): UserStats {
  const row = db.prepare('SELECT role, stats_json FROM users WHERE id = ?').get(userId) as { role?: string; stats_json: string } | undefined;
  if (!row || row.role === 'admin' || row.role === 'superadmin') return DEFAULT_USER_STATS;
  return JSON.parse(row.stats_json);
}

export function saveUserStats(userId: string, stats: UserStats): void {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role?: string } | undefined;
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    return;
  }
  db.prepare('UPDATE users SET stats_json = ? WHERE id = ?').run(JSON.stringify(stats), userId);
  syncUpdateUserStats(userId, stats);
}

export function saveSourcePdf(filename: string, mimeType: string, base64Data?: string, textContent?: string, skipCloudSync = false): void {
  db.prepare(`
    INSERT INTO source_pdfs (filename, mime_type, base64_data, text_content, uploaded_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(filename) DO UPDATE SET
      mime_type = excluded.mime_type,
      base64_data = COALESCE(excluded.base64_data, source_pdfs.base64_data),
      text_content = COALESCE(excluded.text_content, source_pdfs.text_content),
      uploaded_at = excluded.uploaded_at
  `).run(filename, mimeType, base64Data || null, textContent || null, new Date().toISOString());
  if (!skipCloudSync) {
    syncSaveSourcePdf(filename, mimeType, base64Data, textContent);
  }
}

export function saveStagingDrafts(id: string, sourceFilename: string, drafts: any[], skipCloudSync = false): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pdf_staging_drafts (id, source_filename, drafts_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_filename = excluded.source_filename,
      drafts_json = excluded.drafts_json,
      updated_at = excluded.updated_at
  `).run(id, sourceFilename, JSON.stringify(drafts), now);
  if (!skipCloudSync) {
    syncSaveStagingDrafts(id, sourceFilename, drafts);
  }
}

export function getLatestStagingDrafts(): { id: string; sourceFilename: string; drafts: any[]; updatedAt: string } | null {
  const row = db
    .prepare('SELECT * FROM pdf_staging_drafts ORDER BY updated_at DESC LIMIT 1')
    .get() as any;
  if (!row) return null;
  return {
    id: row.id,
    sourceFilename: row.source_filename,
    drafts: JSON.parse(row.drafts_json),
    updatedAt: row.updated_at,
  };
}

export function clearStagingDrafts(id = 'default-staging'): void {
  db.prepare('DELETE FROM pdf_staging_drafts WHERE id = ?').run(id);
  syncDeleteStagingDrafts(id);
}

/**
 * Automatically purges expired ephemeral records to save database storage space:
 * - active_exams older than 24 hours
 * - sessions older than 7 days
 * - pdf_staging_drafts unused for > 7 days
 * - source_pdfs older than 14 days
 */
export function cleanupExpiredData(): void {
  const nowMs = Date.now();
  const cutoff24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const cutoff7d = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff14d = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('DELETE FROM active_exams WHERE started_at < ?').run(cutoff24h);
  db.prepare('DELETE FROM sessions WHERE created_at < ?').run(cutoff7d);
  db.prepare('DELETE FROM pdf_staging_drafts WHERE updated_at < ?').run(cutoff7d);
  db.prepare('DELETE FROM source_pdfs WHERE uploaded_at < ?').run(cutoff14d);

  syncCleanupExpiredRecords();
}

export async function hydrateFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    logSupabaseDisabledOnce();
    return;
  }

  // Run automatic TTL cleanup first so expired temporary rows are removed before hydration
  cleanupExpiredData();

  // 1. Hydrate Categories (or seed Supabase if empty)
  const cloudCategories = await supabaseRequest<{ id: string; sort_order: number; data_json: any }[]>(
    'categories?select=*&order=sort_order.asc'
  );
  if (Array.isArray(cloudCategories)) {
    if (cloudCategories.length > 0) {
      const parsed = cloudCategories.map((c) =>
        typeof c.data_json === 'string' ? JSON.parse(c.data_json) : c.data_json
      );
      saveAllCategories(parsed, true);
    } else {
      syncSaveCategories(getAllCategories());
    }
  }

  // 2. Hydrate Questions (or push local questions to Supabase if cloud is empty and local has questions)
  const cloudQuestions = await supabaseRequest<{ id: string; data_json: any }[]>(
    'questions?select=*&order=created_at.desc'
  );
  if (Array.isArray(cloudQuestions)) {
    if (cloudQuestions.length > 0) {
      for (const row of cloudQuestions) {
        const q: MCQQuestion =
          typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
        upsertQuestion(q, true);
      }
    } else {
      const localQuestions = getAllQuestions(true);
      for (const q of localQuestions) {
        syncUpsertQuestion(q);
      }
    }
  }

  // 3. Hydrate Reports
  const cloudReports = await supabaseRequest<any[]>('reports?select=*&order=submitted_at.desc');
  if (Array.isArray(cloudReports) && cloudReports.length > 0) {
    for (const r of cloudReports) {
      insertReport(
        {
          id: r.id,
          questionId: r.question_id,
          questionCode: r.question_code,
          reason: r.reason,
          details: r.details,
          submittedAt: r.submitted_at,
          status: r.status,
          userId: r.user_id || null,
        },
        true
      );
    }
  }

  // 4. Hydrate Users (or push default local users to Supabase)
  const cloudUsers = await supabaseRequest<any[]>('users?select=*');
  if (Array.isArray(cloudUsers)) {
    if (cloudUsers.length > 0) {
      const upsertU = db.prepare(`
        INSERT INTO users (
          id, username, email, password_hash, role, display_name, stats_json, created_at,
          email_verified, email_verify_token_hash, email_verify_expires, leaderboard_hidden
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          email = excluded.email,
          password_hash = excluded.password_hash,
          role = excluded.role,
          display_name = excluded.display_name,
          stats_json = excluded.stats_json,
          email_verified = excluded.email_verified,
          email_verify_token_hash = excluded.email_verify_token_hash,
          email_verify_expires = excluded.email_verify_expires,
          leaderboard_hidden = excluded.leaderboard_hidden
      `);
      for (const u of cloudUsers) {
        const isStaff = u.role === 'admin' || u.role === 'superadmin';
        const statsStr = isStaff
          ? JSON.stringify(DEFAULT_USER_STATS)
          : typeof u.stats_json === 'string'
          ? u.stats_json
          : JSON.stringify(u.stats_json || DEFAULT_USER_STATS);
        upsertU.run(
          u.id,
          u.username,
          u.email || null,
          u.password_hash || null,
          u.role,
          u.display_name,
          statsStr,
          u.created_at,
          u.email_verified !== undefined && u.email_verified !== null ? Number(u.email_verified) : 1,
          u.email_verify_token_hash || null,
          u.email_verify_expires || null,
          u.leaderboard_hidden ? 1 : 0
        );
      }
    } else {
      const localUsers = db.prepare('SELECT * FROM users').all() as any[];
      for (const u of localUsers) {
        syncUpsertUser(u);
      }
    }
  }

  // 5. Hydrate Active Sessions (so logged-in users remain authenticated across Render container restarts)
  const cloudSessions = await supabaseRequest<any[]>('sessions?select=*');
  if (Array.isArray(cloudSessions) && cloudSessions.length > 0) {
    const upsertSession = db.prepare(`
      INSERT INTO sessions (token, user_id, role, created_at, user_agent, ip)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        user_id = excluded.user_id,
        role = excluded.role,
        created_at = excluded.created_at,
        user_agent = excluded.user_agent,
        ip = excluded.ip
    `);
    for (const s of cloudSessions) {
      upsertSession.run(
        s.token,
        s.user_id,
        s.role,
        s.created_at,
        s.user_agent || null,
        s.ip || null
      );
    }
  }

  // 6. Hydrate Password Reset Tokens
  const cloudResets = await supabaseRequest<any[]>('password_resets?select=*');
  if (Array.isArray(cloudResets) && cloudResets.length > 0) {
    const upsertReset = db.prepare(`
      INSERT INTO password_resets (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        user_id = excluded.user_id,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `);
    for (const pr of cloudResets) {
      upsertReset.run(pr.token, pr.user_id, pr.expires_at, pr.created_at);
    }
  }

  // 7. Hydrate Active Timed Exams
  const cloudActiveExams = await supabaseRequest<any[]>('active_exams?select=*');
  if (Array.isArray(cloudActiveExams) && cloudActiveExams.length > 0) {
    const upsertExam = db.prepare(`
      INSERT INTO active_exams (
        id, user_id, title, questions_json, started_at, duration_minutes,
        negative_marking, penalty_per_wrong, is_grand_test, passing_percentage
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        title = excluded.title,
        questions_json = excluded.questions_json,
        started_at = excluded.started_at,
        duration_minutes = excluded.duration_minutes,
        negative_marking = excluded.negative_marking,
        penalty_per_wrong = excluded.penalty_per_wrong,
        is_grand_test = excluded.is_grand_test,
        passing_percentage = excluded.passing_percentage
    `);
    for (const ex of cloudActiveExams) {
      const qJson = typeof ex.questions_json === 'string' ? ex.questions_json : JSON.stringify(ex.questions_json || []);
      upsertExam.run(
        ex.id,
        ex.user_id || null,
        ex.title,
        qJson,
        ex.started_at,
        ex.duration_minutes,
        ex.negative_marking ? 1 : 0,
        typeof ex.penalty_per_wrong === 'number' ? ex.penalty_per_wrong : 0.25,
        ex.is_grand_test ? 1 : 0,
        typeof ex.passing_percentage === 'number' ? ex.passing_percentage : 70
      );
    }
  }

  // 8. Hydrate Completed Exam Attempts & Leaderboard Records
  const cloudAttempts = await supabaseRequest<any[]>('exam_attempts?select=*&order=completed_at.desc');
  if (Array.isArray(cloudAttempts)) {
    if (cloudAttempts.length > 0) {
      const upsertAttempt = db.prepare(`
        INSERT INTO exam_attempts (
          id, user_id, display_name, title, total, correct_count, score,
          percentage, passed, time_spent_seconds, negative_marking, is_grand_test, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          display_name = excluded.display_name,
          score = excluded.score,
          percentage = excluded.percentage,
          passed = excluded.passed,
          time_spent_seconds = excluded.time_spent_seconds
      `);
      for (const att of cloudAttempts) {
        upsertAttempt.run(
          att.id,
          att.user_id,
          att.display_name,
          att.title,
          att.total,
          att.correct_count,
          att.score,
          att.percentage,
          att.passed ? 1 : 0,
          att.time_spent_seconds,
          att.negative_marking ? 1 : 0,
          att.is_grand_test ? 1 : 0,
          att.completed_at
        );
      }
    } else {
      const localAttempts = db.prepare('SELECT * FROM exam_attempts').all() as any[];
      for (const att of localAttempts) {
        syncInsertExamAttempt(att);
      }
    }
  }

  // 9. Hydrate Weekly Grand Test Papers
  const cloudWeeklyPapers = await supabaseRequest<any[]>('weekly_papers?select=*');
  if (Array.isArray(cloudWeeklyPapers) && cloudWeeklyPapers.length > 0) {
    const upsertPaper = db.prepare(`
      INSERT INTO weekly_papers (window_start, question_ids_json, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(window_start) DO UPDATE SET
        question_ids_json = excluded.question_ids_json
    `);
    for (const wp of cloudWeeklyPapers) {
      const qIdsStr = typeof wp.question_ids_json === 'string' ? wp.question_ids_json : JSON.stringify(wp.question_ids_json || []);
      upsertPaper.run(wp.window_start, qIdsStr, wp.created_at);
    }
  }

  // 10. Hydrate Mock Set Configurations
  const cloudMockConfigs = await supabaseRequest<any[]>('mock_set_configs?select=*');
  if (Array.isArray(cloudMockConfigs) && cloudMockConfigs.length > 0) {
    const upsertMockCfg = db.prepare(`
      INSERT INTO mock_set_configs (
        syllabus_code, set_number, duration_minutes, negative_marking, penalty_per_wrong, passing_percentage, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(syllabus_code, set_number) DO UPDATE SET
        duration_minutes = excluded.duration_minutes,
        negative_marking = excluded.negative_marking,
        penalty_per_wrong = excluded.penalty_per_wrong,
        passing_percentage = excluded.passing_percentage,
        updated_at = excluded.updated_at
    `);
    for (const mc of cloudMockConfigs) {
      upsertMockCfg.run(
        mc.syllabus_code,
        mc.set_number,
        mc.duration_minutes,
        mc.negative_marking ? 1 : 0,
        mc.penalty_per_wrong,
        mc.passing_percentage,
        mc.updated_at
      );
    }
  }

  // 11. Hydrate Billing Subscriptions, Payments & Quotas
  const cloudSubs = await supabaseRequest<any[]>('subscriptions?select=*');
  if (Array.isArray(cloudSubs) && cloudSubs.length > 0) {
    const upsertSub = db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan_id, status, source, starts_at, expires_at, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        expires_at = excluded.expires_at
    `);
    for (const s of cloudSubs) {
      upsertSub.run(s.id, s.user_id, s.plan_id || null, s.status, s.source, s.starts_at, s.expires_at, s.created_at, s.created_by || null);
    }
  }

  const cloudPayments = await supabaseRequest<any[]>('payments?select=*');
  if (Array.isArray(cloudPayments) && cloudPayments.length > 0) {
    const upsertPay = db.prepare(`
      INSERT INTO payments (id, user_id, plan_id, gateway, amount_npr, status, gateway_ref, gateway_payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        gateway_ref = excluded.gateway_ref,
        gateway_payload = excluded.gateway_payload,
        updated_at = excluded.updated_at
    `);
    for (const p of cloudPayments) {
      upsertPay.run(
        p.id,
        p.user_id,
        p.plan_id,
        p.gateway,
        p.amount_npr,
        p.status,
        p.gateway_ref || null,
        p.gateway_payload || null,
        p.created_at,
        p.updated_at
      );
    }
  }

  const cloudPracticeUsage = await supabaseRequest<any[]>('practice_usage?select=*');
  if (Array.isArray(cloudPracticeUsage) && cloudPracticeUsage.length > 0) {
    const upsertPractice = db.prepare(`
      INSERT OR IGNORE INTO practice_usage (usage_key, unit, question_id, first_answered_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const pu of cloudPracticeUsage) {
      upsertPractice.run(pu.usage_key, pu.unit, pu.question_id, pu.first_answered_at);
    }
  }

  const cloudExamUsage = await supabaseRequest<any[]>('exam_usage?select=*');
  if (Array.isArray(cloudExamUsage) && cloudExamUsage.length > 0) {
    const upsertExamUsage = db.prepare(`
      INSERT INTO exam_usage (usage_key, free_mock_used, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(usage_key) DO UPDATE SET
        free_mock_used = MAX(exam_usage.free_mock_used, excluded.free_mock_used),
        updated_at = excluded.updated_at
    `);
    for (const eu of cloudExamUsage) {
      upsertExamUsage.run(eu.usage_key, eu.free_mock_used, eu.updated_at);
    }
  }

  // 12. Hydrate Unsubmitted PDF Staging Drafts
  const cloudStaging = await supabaseRequest<any[]>('pdf_staging_drafts?select=*');
  if (Array.isArray(cloudStaging) && cloudStaging.length > 0) {
    for (const st of cloudStaging) {
      const drafts = typeof st.drafts_json === 'string' ? JSON.parse(st.drafts_json) : st.drafts_json;
      saveStagingDrafts(st.id, st.source_filename, drafts || [], true);
    }
  }

  // 13. Hydrate Source PDFs
  const cloudPdfs = await supabaseRequest<any[]>('source_pdfs?select=*');
  if (Array.isArray(cloudPdfs) && cloudPdfs.length > 0) {
    for (const pdf of cloudPdfs) {
      saveSourcePdf(
        pdf.filename,
        pdf.mime_type,
        pdf.base64_data || undefined,
        pdf.text_content || undefined,
        true
      );
    }
  }
}

export function getSourcePdf(filename: string): { filename: string; mimeType: string; base64Data?: string; textContent?: string; uploadedAt: string } | null {
  const row = db.prepare('SELECT * FROM source_pdfs WHERE filename = ?').get(filename) as any;
  if (!row) return null;
  return {
    filename: row.filename,
    mimeType: row.mime_type,
    base64Data: row.base64_data || undefined,
    textContent: row.text_content || undefined,
    uploadedAt: row.uploaded_at,
  };
}

export function listSourcePdfs(): { filename: string; mimeType: string; uploadedAt: string }[] {
  const rows = db.prepare('SELECT filename, mime_type, uploaded_at FROM source_pdfs ORDER BY uploaded_at DESC').all() as any[];
  return rows.map((r) => ({
    filename: r.filename,
    mimeType: r.mime_type,
    uploadedAt: r.uploaded_at,
  }));
}
