import { MCQQuestion, UnitCategory, QuestionReport, UserStats } from '../types';

let hasLoggedDisabled = false;

export function logSupabaseDisabledOnce(): void {
  if (!hasLoggedDisabled) {
    console.log('Supabase sync disabled; running SQLite-only');
    hasLoggedDisabled = true;
  }
}

function getSupabaseConfig(): { url: string; key: string } | null {
  if (process.env.SUPABASE_SYNC_ENABLED !== 'true') {
    return null;
  }

  const rawUrl = (process.env.SUPABASE_URL || '').trim();
  const url = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, key: serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

async function supabaseRequest<T = any>(
  tableAndQuery: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    prefer?: string;
  } = {}
): Promise<T | null> {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  const headers: Record<string, string> = {
    apikey: cfg.key,
    'Content-Type': 'application/json',
  };
  if (!cfg.key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${cfg.key}`;
  }
  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/${tableAndQuery}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Supabase Sync] ${options.method || 'GET'} /rest/v1/${tableAndQuery} returned ${res.status}: ${errText}`);
      return null;
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn(`[Supabase Sync] Request error on ${tableAndQuery}:`, err);
    return null;
  }
}

export async function pingSupabaseKeepAlive(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    logSupabaseDisabledOnce();
    return false;
  }
  const rows = await supabaseRequest<any[]>('categories?select=id&limit=1');
  return Array.isArray(rows);
}

export function syncUpsertQuestion(q: MCQQuestion): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('questions?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id: q.id,
      code: q.code,
      unit: q.unit,
      subject: q.subject,
      topic: q.topic,
      subtopic: q.subtopic || null,
      difficulty: q.difficulty,
      status: q.status,
      created_at: q.createdAt,
      updated_at: q.updatedAt,
      data_json: q,
    },
  });
}

export function syncBulkQuestions(questions: MCQQuestion[]): void {
  if (!isSupabaseConfigured() || questions.length === 0) return;
  const payload = questions.map((q) => ({
    id: q.id,
    code: q.code,
    unit: q.unit,
    subject: q.subject,
    topic: q.topic,
    subtopic: q.subtopic || null,
    difficulty: q.difficulty,
    status: q.status,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
    data_json: q,
  }));
  void supabaseRequest('questions?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: payload,
  });
}

export function syncDeleteQuestion(id: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`questions?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncBulkDeleteQuestions(ids: string[]): void {
  if (!isSupabaseConfigured() || ids.length === 0) return;
  void (async () => {
    // Chunk to keep PostgREST URLs within safe length limits
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100).map((id) => `"${id.replace(/"/g, '')}"`);
      await supabaseRequest(`questions?id=in.(${encodeURIComponent(chunk.join(','))})`, {
        method: 'DELETE',
        prefer: 'return=minimal',
      });
    }
  })().catch((err) => {
    console.warn('[Supabase Sync Error] Bulk delete questions failed:', err);
  });
}

export function syncSaveCategories(categories: UnitCategory[]): void {
  if (!isSupabaseConfigured()) return;
  void (async () => {
    await supabaseRequest('categories?id=not.is.null', {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    if (categories.length > 0) {
      await supabaseRequest('categories?on_conflict=id', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: categories.map((cat, idx) => ({
          id: cat.id,
          sort_order: idx,
          data_json: cat,
        })),
      });
    }
  })().catch((err) => {
    console.warn('[Supabase Sync Error] Save categories failed:', err);
  });
}

export function syncInsertReport(report: QuestionReport): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('reports?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id: report.id,
      question_id: report.questionId,
      question_code: report.questionCode,
      reason: report.reason,
      details: report.details,
      submitted_at: report.submittedAt,
      status: report.status,
      user_id: report.userId || null,
    },
  });
}

export function syncUpdateReportStatus(id: string, status: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`reports?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { status },
  });
}

export function syncUpsertUser(user: {
  id: string;
  username: string;
  email?: string | null;
  password_hash?: string | null;
  role: string;
  display_name: string;
  stats_json: string;
  created_at: string;
  email_verified?: number | boolean;
  email_verify_token_hash?: string | null;
  email_verify_expires?: string | null;
  google_sub?: string | null;
}): void {
  if (!isSupabaseConfigured()) return;
  let parsedStats: any = {};
  try {
    parsedStats = typeof user.stats_json === 'string' ? JSON.parse(user.stats_json) : user.stats_json;
  } catch {
    parsedStats = {};
  }
  const body: Record<string, any> = {
    id: user.id,
    username: user.username,
    email: user.email || null,
    password_hash: user.password_hash || null,
    role: user.role,
    display_name: user.display_name,
    stats_json: parsedStats,
    created_at: user.created_at,
  };
  if (user.email_verified !== undefined) {
    body.email_verified = user.email_verified ? 1 : 0;
  }
  if (user.email_verify_token_hash !== undefined) {
    body.email_verify_token_hash = user.email_verify_token_hash;
  }
  if (user.email_verify_expires !== undefined) {
    body.email_verify_expires = user.email_verify_expires;
  }
  if (user.google_sub !== undefined) {
    body.google_sub = user.google_sub;
  }

  void supabaseRequest('users?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body,
  });
}

export function syncPatchUser(userId: string, fields: Record<string, any>): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: fields,
  });
}

export function syncUpdateUserRole(userId: string, role: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { role },
  });
}

export function syncUpdateUserStats(userId: string, stats: UserStats): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { stats_json: stats },
  });
}

export function syncDeleteUser(userId: string): void {
  if (!isSupabaseConfigured()) return;
  void (async () => {
    const encoded = encodeURIComponent(userId);
    await supabaseRequest(`sessions?user_id=eq.${encoded}`, { method: 'DELETE', prefer: 'return=minimal' });
    await supabaseRequest(`password_resets?user_id=eq.${encoded}`, { method: 'DELETE', prefer: 'return=minimal' });
    await supabaseRequest(`exam_attempts?user_id=eq.${encoded}`, { method: 'DELETE', prefer: 'return=minimal' });
    await supabaseRequest(`active_exams?user_id=eq.${encoded}`, { method: 'DELETE', prefer: 'return=minimal' });
    await supabaseRequest(`reports?user_id=eq.${encoded}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: { user_id: null },
    });
    await supabaseRequest(`users?id=eq.${encoded}`, { method: 'DELETE', prefer: 'return=minimal' });
  })().catch((err) => {
    console.error('[Supabase] Failed to sync user deletion:', err);
  });
}

export function syncSaveSourcePdf(
  filename: string,
  mimeType: string,
  base64Data?: string,
  textContent?: string
): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('source_pdfs?on_conflict=filename', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      filename,
      mime_type: mimeType,
      base64_data: base64Data || null,
      text_content: textContent || null,
      uploaded_at: new Date().toISOString(),
    },
  });
}

export function syncInsertSession(
  tokenHash: string,
  userId: string,
  role: string,
  createdAt: string,
  userAgent?: string,
  ip?: string
): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('sessions?on_conflict=token', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      token: tokenHash,
      user_id: userId,
      role,
      created_at: createdAt,
      user_agent: userAgent || null,
      ip: ip || null,
    },
  });
}

export function syncDeleteSession(tokenHash: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`sessions?token=eq.${encodeURIComponent(tokenHash)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncDeleteUserSessions(userId: string, exceptTokenHash?: string): void {
  if (!isSupabaseConfigured()) return;
  let query = `sessions?user_id=eq.${encodeURIComponent(userId)}`;
  if (exceptTokenHash) {
    query += `&token=neq.${encodeURIComponent(exceptTokenHash)}`;
  }
  void supabaseRequest(query, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncUpdateUserSessionRole(userId: string, role: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`sessions?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { role },
  });
}

export function syncUpsertPasswordReset(
  tokenHash: string,
  userId: string,
  expiresAt: string,
  createdAt: string
): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('password_resets?on_conflict=token', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      token: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
      created_at: createdAt,
    },
  });
}

export function syncDeletePasswordReset(tokenHash: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`password_resets?token=eq.${encodeURIComponent(tokenHash)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncDeleteUserPasswordResets(userId: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`password_resets?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncInsertActiveExam(exam: {
  id: string;
  userId: string;
  title: string;
  questions: any[];
  startedAt: string;
  durationMinutes: number;
  negativeMarking?: number;
  penaltyPerWrong?: number;
  isGrandTest?: number;
  passingPercentage?: number;
}): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('active_exams?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id: exam.id,
      user_id: exam.userId,
      title: exam.title,
      questions_json: exam.questions,
      started_at: exam.startedAt,
      duration_minutes: exam.durationMinutes,
      negative_marking: exam.negativeMarking ?? 0,
      penalty_per_wrong: exam.penaltyPerWrong ?? 0.25,
      is_grand_test: exam.isGrandTest ?? 0,
      passing_percentage: exam.passingPercentage ?? 70,
    },
  });
}

export function syncDeleteActiveExam(id: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`active_exams?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncDeleteUserActiveExams(userId: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`active_exams?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export interface ExamAttemptRow {
  id: string;
  user_id: string;
  display_name: string;
  title: string;
  total: number;
  correct_count: number;
  score: number;
  percentage: number;
  passed: number;
  time_spent_seconds: number;
  negative_marking: number;
  is_grand_test: number;
  completed_at: string;
}

export function syncInsertExamAttempt(attempt: ExamAttemptRow): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('exam_attempts?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: attempt,
  });
}

export function syncDeleteUserExamAttempts(userId: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`exam_attempts?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncSaveStagingDrafts(id: string, sourceFilename: string, drafts: any[]): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest('pdf_staging_drafts?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id,
      source_filename: sourceFilename,
      drafts_json: drafts,
      updated_at: new Date().toISOString(),
    },
  });
}

export function syncDeleteStagingDrafts(id: string): void {
  if (!isSupabaseConfigured()) return;
  void supabaseRequest(`pdf_staging_drafts?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

export function syncCleanupExpiredRecords(): void {
  if (!isSupabaseConfigured()) return;
  void (async () => {
    const now = Date.now();
    const cutoff24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff14d = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date(now).toISOString();

    await supabaseRequest(`active_exams?started_at=lt.${encodeURIComponent(cutoff24h)}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    await supabaseRequest(`sessions?created_at=lt.${encodeURIComponent(cutoff7d)}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    await supabaseRequest(`password_resets?expires_at=lt.${encodeURIComponent(nowIso)}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    await supabaseRequest(`pdf_staging_drafts?updated_at=lt.${encodeURIComponent(cutoff7d)}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    await supabaseRequest(`source_pdfs?uploaded_at=lt.${encodeURIComponent(cutoff14d)}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  })().catch((err) => {
    console.warn('[Supabase Sync] Failed to cleanup expired records:', err);
  });
}

export { supabaseRequest };
