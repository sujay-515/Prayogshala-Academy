import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { parseRawMCQText, findDuplicateQuestion, validateExtractedQuestion } from './src/utils/mcqParser';
import { extractTextFromPdfBuffer } from './src/utils/pdfTextExtractor';
import { calculateExamScore } from './src/utils/scoring';
import { ExtractedMCQDraft, MCQQuestion, QuestionReport } from './src/types';
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
  saveSourcePdf,
  getSourcePdf,
  listSourcePdfs,
  saveStagingDrafts,
  getLatestStagingDrafts,
  clearStagingDrafts,
  cleanupExpiredData,
  hydrateFromSupabase,
} from './src/server/db';
import {
  isSupabaseConfigured,
  pingSupabaseKeepAlive,
  syncUpsertUser,
  syncInsertSession,
  syncDeleteSession,
  syncInsertActiveExam,
  syncDeleteActiveExam,
} from './src/server/supabaseSync';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cloud vision & OCR client initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const loginAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

// Helper to resolve session from Authorization header (with 7-day TTL expiration check)
function getSessionUser(req: express.Request): { userId: string; role: string; username: string; displayName: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const row = db
    .prepare(
      `SELECT s.user_id, s.role, s.created_at, u.username, u.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as any;
  if (!row) return null;

  if (row.created_at && Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    syncDeleteSession(token);
    return null;
  }

  return {
    userId: row.user_id,
    role: row.role,
    username: row.username,
    displayName: row.display_name,
  };
}

// Middleware to enforce role-based administrator permissions on management endpoints
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (session.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Administrator privileges required.' });
  }
  return next();
}

// Health check (also triggers a background Supabase keep-alive ping to prevent 7-day free-tier pause)
app.get('/api/health', (req, res) => {
  const totalQuestions = (db.prepare('SELECT COUNT(*) as cnt FROM questions').get() as { cnt: number }).cnt;
  if (isSupabaseConfigured()) {
    void pingSupabaseKeepAlive();
  }
  res.json({
    status: 'ok',
    database: isSupabaseConfigured() ? 'sqlite+supabase' : 'sqlite',
    supabaseConnected: isSupabaseConfigured(),
    totalQuestions,
    hasGeminiApiKey: !!apiKey,
  });
});

// Bootstrap endpoint for initial load (scopes unpublished drafts & admin reports to admin role)
app.get('/api/bootstrap', (req, res) => {
  const session = getSessionUser(req);
  const isAdmin = session?.role === 'admin';
  const userId = session ? session.userId : 'usr-guest';
  res.json({
    success: true,
    questions: getAllQuestions(isAdmin),
    categories: getAllCategories(),
    reports: isAdmin ? getAllReports() : [],
    stats: getUserStats(userId),
    sourcePdfs: isAdmin ? listSourcePdfs() : [],
    user: session
      ? {
          id: session.userId,
          username: session.username,
          role: session.role,
          displayName: session.displayName,
        }
      : null,
  });
});

// ==================== AUTHENTICATION APIs ====================
app.post('/api/auth/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const nowMs = Date.now();
  const attempt = loginAttemptsByIp.get(clientIp);
  if (attempt && nowMs < attempt.resetAt && attempt.count >= 10) {
    return res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please wait a few minutes before retrying.',
    });
  }

  const { username = 'admin', password = '' } = req.body;
  const userRow = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(String(username).toLowerCase().trim()) as any;

  if (!userRow || !verifyPassword(String(password), userRow.password_hash)) {
    const nextCount = attempt && nowMs < attempt.resetAt ? attempt.count + 1 : 1;
    loginAttemptsByIp.set(clientIp, { count: nextCount, resetAt: nowMs + 15 * 60 * 1000 });
    return res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }

  loginAttemptsByIp.delete(clientIp);

  // Upgrade legacy unsalted hash to per-user random salt if needed
  if (!userRow.password_hash.includes(':')) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userRow.id);
  }

  const token = crypto.randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    userRow.id,
    userRow.role,
    now
  );
  syncInsertSession(token, userRow.id, userRow.role, now);

  return res.json({
    success: true,
    token,
    user: {
      id: userRow.id,
      username: userRow.username,
      role: userRow.role,
      displayName: userRow.display_name,
    },
    stats: JSON.parse(userRow.stats_json),
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password || password.length < 4) {
    return res.status(400).json({
      success: false,
      error: 'Username and a password of at least 4 characters are required.',
    });
  }

  const cleanUsername = String(username).toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Username is already registered.' });
  }

  const id = `usr-${Date.now()}`;
  const now = new Date().toISOString();
  const initialStats = {
    ...DEFAULT_USER_STATS,
    lastActiveDate: now.slice(0, 10),
    bookmarkedIds: [],
    revisionQueueIds: [],
    subjectPerformance: {},
    topicPerformance: {},
    examRecords: [],
  };

  const passwordHash = hashPassword(password);
  const finalDisplayName = displayName?.trim() || cleanUsername;
  const statsJson = JSON.stringify(initialStats);

  db.prepare(
    `INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    cleanUsername,
    passwordHash,
    'student',
    finalDisplayName,
    statsJson,
    now
  );

  syncUpsertUser({
    id,
    username: cleanUsername,
    password_hash: passwordHash,
    role: 'student',
    display_name: finalDisplayName,
    stats_json: statsJson,
    created_at: now,
  });

  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    id,
    'student',
    now
  );
  syncInsertSession(token, id, 'student', now);

  return res.json({
    success: true,
    token,
    user: {
      id,
      username: cleanUsername,
      role: 'student',
      displayName: displayName?.trim() || cleanUsername,
    },
    stats: initialStats,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    syncDeleteSession(token);
  }
  res.json({ success: true });
});

// ==================== QUESTIONS & CATEGORIES APIs ====================
app.get('/api/questions', (req, res) => {
  const session = getSessionUser(req);
  const isAdmin = session?.role === 'admin';
  const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

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

  res.json({
    success: true,
    ...result,
  });
});

app.get('/api/questions/:id', (req, res) => {
  const q = getQuestionById(req.params.id);
  if (!q) {
    return res.status(404).json({ success: false, error: 'Question not found' });
  }
  const session = getSessionUser(req);
  if (q.status !== 'Published' && session?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Question is not published' });
  }
  return res.json({ success: true, question: q });
});

app.post('/api/questions', requireAdmin, (req, res) => {
  const question: MCQQuestion = req.body.question || req.body;
  if (!question || !question.id) {
    return res.status(400).json({ success: false, error: 'Valid question record required' });
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

app.post('/api/questions/bulk-upsert', requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.some((q) => !q || typeof q.id !== 'string')) {
    return res.status(400).json({ success: false, error: 'questions array with ids required' });
  }
  bulkInsertQuestions(questions);
  return res.json({ success: true, count: questions.length });
});

app.post('/api/questions/bulk-status', requireAdmin, (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !status) {
    return res.status(400).json({ success: false, error: 'ids array and status required' });
  }
  const updated = bulkUpdateQuestionStatus(ids, status);
  return res.json({ success: true, questions: updated });
});

app.post('/api/questions/bulk-import', requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: 'questions array required' });
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

// ==================== USER STATS & ANALYTICS APIs ====================
app.put('/api/stats', (req, res) => {
  const session = getSessionUser(req);
  const userId = session ? session.userId : 'usr-guest';
  const { stats } = req.body;
  if (!stats) {
    return res.status(400).json({ success: false, error: 'stats object required' });
  }
  saveUserStats(userId, stats);
  return res.json({ success: true, stats });
});

// ==================== PROTECTED EXAM ENGINE APIs ====================
// Protects correct answers during active examinations (Section 4 of app.pdf)
app.post('/api/exams/start', (req, res) => {
  const {
    examCategory = 'All',
    unit = 'All',
    difficulty = 'All',
    questionCount = 10,
    durationMinutes = 15,
    shuffleOptions = false,
  } = req.body;

  const session = getSessionUser(req);
  const allPublished = getAllQuestions().filter((q) => q.status === 'Published');

  const pool = allPublished.filter((q) => {
    if (examCategory !== 'All' && !q.examCategories.includes(examCategory)) return false;
    if (unit !== 'All' && q.unit !== unit) return false;
    if (difficulty !== 'All' && q.difficulty !== difficulty) return false;
    return true;
  });

  // Fisher-Yates shuffle on candidate question pool
  const poolCopy = [...pool];
  for (let i = poolCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
  }
  const shuffled = poolCopy.slice(0, questionCount);

  // Optionally shuffle option texts while keeping option IDs A, B, C, D consistent
  // Track original option identity directly so duplicate option texts never corrupt the answer key
  const preparedQuestions: MCQQuestion[] = shuffled.map((q) => {
    if (!shuffleOptions || q.options.length <= 1) return q;
    const taggedOptions = q.options.map((o) => ({
      text: o.text,
      wasCorrect: o.id === q.correctAnswer,
    }));
    for (let i = taggedOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [taggedOptions[i], taggedOptions[j]] = [taggedOptions[j], taggedOptions[i]];
    }
    const optionIds: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    let newCorrect: 'A' | 'B' | 'C' | 'D' | 'E' = q.correctAnswer;
    const newOptions = taggedOptions.map((item, idx) => {
      const assignedId = q.options[idx]?.id || optionIds[idx] || 'A';
      if (item.wasCorrect) {
        newCorrect = assignedId;
      }
      return {
        id: assignedId,
        text: item.text,
      };
    });
    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrect,
    };
  });

  const examId = `exam-sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const title = `${examCategory === 'All' ? 'Comprehensive' : examCategory} Laboratory Medicine Examination`;
  const startedAt = new Date().toISOString();
  const examUserId = session?.userId || 'usr-guest';

  db.prepare(
    `INSERT INTO active_exams (id, user_id, title, questions_json, started_at, duration_minutes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    examId,
    examUserId,
    title,
    JSON.stringify(preparedQuestions),
    startedAt,
    durationMinutes
  );

  syncInsertActiveExam({
    id: examId,
    userId: examUserId,
    title,
    questions: preparedQuestions,
    startedAt,
    durationMinutes,
  });

  // Strip correctAnswer and explanation before sending to client!
  const sanitizedQuestions = preparedQuestions.map(({ correctAnswer, explanation, ...safeQuestion }) => ({
    ...safeQuestion,
    correctAnswer: '' as any,
    explanation: '',
  }));

  return res.json({
    success: true,
    examId,
    title,
    questions: sanitizedQuestions,
  });
});

app.post('/api/exams/:id/submit', (req, res) => {
  const { userAnswers = {}, timeSpentSeconds = 0 } = req.body;
  const row = db.prepare('SELECT * FROM active_exams WHERE id = ?').get(req.params.id) as any;

  if (!row) {
    return res.status(404).json({ success: false, error: 'Exam session not found' });
  }

  const fullQuestions: MCQQuestion[] = JSON.parse(row.questions_json);
  const scoreResult = calculateExamScore(fullQuestions, userAnswers, timeSpentSeconds, 70);

  // Clean up active session immediately after grading in both SQLite and Supabase to save space
  db.prepare('DELETE FROM active_exams WHERE id = ?').run(req.params.id);
  syncDeleteActiveExam(req.params.id);

  return res.json({
    success: true,
    result: scoreResult,
    gradedQuestions: fullQuestions, // Now safe to reveal correctAnswer & explanation for review
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
  "examCategories": ["ASCP", "NHPC", "PSC", "DHA", "AIMS"]
}
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
              examCategories: item.examCategories || ['ASCP', 'NHPC'],
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
    res.status(500).json({ success: false, error: error.message || 'Extraction failed' });
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
app.post('/api/report-question', (req, res) => {
  const { questionId, questionCode, reason, details } = req.body;
  const report: QuestionReport = {
    id: `rep-${Date.now()}`,
    questionId,
    questionCode,
    reason: reason || 'Incorrect Answer',
    details: details || '',
    submittedAt: new Date().toISOString(),
    status: 'Pending',
  };
  insertReport(report);
  const session = getSessionUser(req);
  res.json({
    success: true,
    report,
    reports: session?.role === 'admin' ? getAllReports() : undefined,
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

app.post('/api/backup/restore', requireAdmin, (req, res) => {
  const { questions, categories, reports } = req.body;
  if (Array.isArray(questions)) {
    bulkInsertQuestions(questions);
  }
  if (Array.isArray(categories)) {
    saveAllCategories(categories);
  }
  if (Array.isArray(reports)) {
    for (const r of reports) {
      insertReport(r);
    }
  }
  res.json({
    success: true,
    questions: getAllQuestions(true),
    categories: getAllCategories(),
    reports: getAllReports(),
  });
});

async function startServer() {
  await hydrateFromSupabase();

  // Keep Supabase Free Tier active & automatically purge expired temporary rows every 6 hours
  setInterval(() => {
    cleanupExpiredData();
    if (isSupabaseConfigured()) {
      void pingSupabaseKeepAlive();
    }
  }, 6 * 60 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
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
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedLab QBank server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
