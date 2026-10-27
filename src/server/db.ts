import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { INITIAL_CATEGORIES } from '../data/categories';
import { MCQQuestion, UnitCategory, UserStats, QuestionReport, QuestionStatus } from '../types';
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
  syncUpdateUserStats,
  syncSaveSourcePdf,
  syncSaveStagingDrafts,
  syncDeleteStagingDrafts,
  syncCleanupExpiredRecords,
} from './supabaseSync';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'medlab_qbank.sqlite');
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
`);

// Safe migrations for email support & password resets
try {
  db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
} catch {}

try {
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL').run();
} catch {}

export function hashPassword(password: string, customSalt?: string): string {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, keyHex] = storedHash.split(':');
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  }
  // Legacy static-salt compatibility
  const legacyDerived = crypto.scryptSync(password, 'medlab_salt_2026', 64);
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
  revisionQueueIds: [],
  subjectPerformance: {},
  topicPerformance: {},
  examRecords: [],
};

// Seed initial taxonomy categories and default user accounts if needed (no dummy questions or reports)
function seedDatabaseIfNeeded() {
  const cCountRow = db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number };
  if (cCountRow.cnt === 0) {
    const insertC = db.prepare('INSERT INTO categories (id, sort_order, data_json) VALUES (?, ?, ?)');
    INITIAL_CATEGORIES.forEach((cat, idx) => {
      insertC.run(cat.id, idx, JSON.stringify(cat));
    });
  }

  const uCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (uCountRow.cnt === 0) {
    const now = new Date().toISOString();
    const insertU = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertU.run(
      'usr-admin',
      'admin',
      hashPassword('admin123'),
      'admin',
      'Chief Pathology Administrator',
      JSON.stringify(DEFAULT_USER_STATS),
      now
    );
    insertU.run(
      'usr-guest',
      'guest',
      hashPassword('guest'),
      'student',
      'Guest Candidate',
      JSON.stringify(DEFAULT_USER_STATS),
      now
    );
    insertU.run(
      'usr-student',
      'student',
      hashPassword('student123'),
      'student',
      'MLS Board Candidate',
      JSON.stringify(DEFAULT_USER_STATS),
      now
    );
  } else {
    // Migrate legacy static-salted hashes to per-user random salts
    const legacyUsers = db
      .prepare(`SELECT id, password_hash FROM users WHERE password_hash NOT LIKE '%:%'`)
      .all() as { id: string; password_hash: string }[];
    const updateHash = db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`);
    for (const u of legacyUsers) {
      for (const candidate of ['admin123', 'student123', 'guest']) {
        if (verifyPassword(candidate, u.password_hash)) {
          updateHash.run(hashPassword(candidate), u.id);
          break;
        }
      }
    }
  }

  // Ensure default seeded accounts have emails and roles assigned
  try {
    db.prepare("UPDATE users SET email = 'admin@medlab.local', role = 'superadmin' WHERE username = 'admin' AND (email IS NULL OR role = 'admin')").run();
    db.prepare("UPDATE users SET email = 'student@medlab.local' WHERE username = 'student' AND email IS NULL").run();
  } catch {}
}

seedDatabaseIfNeeded();

// Helper functions for Role-Based Access Control and Email Auth
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function isStaffAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
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
    let parsedStats: any = null;
    try {
      parsedStats = JSON.parse(r.stats_json);
    } catch {}
    return {
      id: r.id,
      username: r.username,
      email: r.email || null,
      role: r.role,
      displayName: r.display_name,
      createdAt: r.created_at,
      totalAnswered: parsedStats?.totalAnswered || 0,
      totalCorrect: parsedStats?.totalCorrect || 0,
    };
  });
}

export function updateUserRole(userId: string, newRole: 'admin' | 'student') {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { success: false, error: 'User not found' };

  // Protect superadmin from being demoted
  if (user.role === 'superadmin' || user.username === 'admin' || isSuperAdminEmail(user.email)) {
    return { success: false, error: 'Head Administrator role is permanent and cannot be modified.' };
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
  db.prepare('UPDATE sessions SET role = ? WHERE user_id = ?').run(newRole, userId);

  return { success: true };
}

export function createPasswordReset(userId: string): string {
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour TTL

  db.prepare('INSERT INTO password_resets (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    expiresAt,
    now.toISOString()
  );

  return token;
}

export function verifyAndConsumeResetToken(token: string, newPasswordHash: string): { success: boolean; error?: string } {
  const row = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token) as any;
  if (!row) {
    return { success: false, error: 'Invalid or expired password reset link.' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
    return { success: false, error: 'Password reset link has expired. Please request a new one.' };
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, row.user_id);
  db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);

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
    filtered = filtered.filter((q) => q.examCategories.includes(params.exam as any));
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.questionText.toLowerCase().includes(s) ||
        q.code.toLowerCase().includes(s) ||
        q.subject.toLowerCase().includes(s) ||
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
    q.code,
    q.unit,
    q.subject,
    q.topic,
    q.subtopic || null,
    q.difficulty,
    q.status,
    q.createdAt,
    q.updatedAt,
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
  }));
}

export function insertReport(report: QuestionReport, skipCloudSync = false): void {
  db.prepare(`
    INSERT INTO reports (id, question_id, question_code, reason, details, submitted_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      details = excluded.details
  `).run(
    report.id,
    report.questionId,
    report.questionCode,
    report.reason,
    report.details,
    report.submittedAt,
    report.status
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
  const row = db.prepare('SELECT stats_json FROM users WHERE id = ?').get(userId) as { stats_json: string } | undefined;
  if (!row) return DEFAULT_USER_STATS;
  return JSON.parse(row.stats_json);
}

export function saveUserStats(userId: string, stats: UserStats): void {
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
  if (!isSupabaseConfigured()) return;

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
        INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          password_hash = excluded.password_hash,
          role = excluded.role,
          display_name = excluded.display_name,
          stats_json = excluded.stats_json
      `);
      for (const u of cloudUsers) {
        const statsStr =
          typeof u.stats_json === 'string' ? u.stats_json : JSON.stringify(u.stats_json || DEFAULT_USER_STATS);
        upsertU.run(u.id, u.username, u.password_hash, u.role, u.display_name, statsStr, u.created_at);
      }
    } else {
      const localUsers = db.prepare('SELECT * FROM users').all() as any[];
      for (const u of localUsers) {
        syncUpsertUser(u);
      }
    }
  }

  // 5. Hydrate Active Sessions
  const cloudSessions = await supabaseRequest<any[]>('sessions?select=*');
  if (Array.isArray(cloudSessions) && cloudSessions.length > 0) {
    const upsertS = db.prepare(`
      INSERT OR IGNORE INTO sessions (token, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const s of cloudSessions) {
      upsertS.run(s.token, s.user_id, s.role, s.created_at);
    }
  }

  // 6. Hydrate Unsubmitted PDF Staging Drafts
  const cloudStaging = await supabaseRequest<any[]>('pdf_staging_drafts?select=*');
  if (Array.isArray(cloudStaging) && cloudStaging.length > 0) {
    for (const st of cloudStaging) {
      const drafts = typeof st.drafts_json === 'string' ? JSON.parse(st.drafts_json) : st.drafts_json;
      saveStagingDrafts(st.id, st.source_filename, drafts || [], true);
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
