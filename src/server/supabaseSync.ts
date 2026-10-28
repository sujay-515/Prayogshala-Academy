import { MCQQuestion, UnitCategory, QuestionReport, UserStats } from '../types';

let hasLoggedAnonError = false;

function getSupabaseConfig(): { url: string; key: string } | null {
  const rawUrl = (process.env.SUPABASE_URL || '').trim();
  const url = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  if (!url) return null;

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const rawKey = (process.env.SUPABASE_KEY || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

  // If service_role key is explicitly provided, use it
  if (serviceRoleKey) {
    return { url, key: serviceRoleKey };
  }

  // Check candidate key (SUPABASE_KEY or SUPABASE_ANON_KEY)
  const candidateKey = rawKey || anonKey;
  if (!candidateKey) return null;

  // Determine if candidate key is an anon key
  let isAnonKey = candidateKey === anonKey;
  if (!isAnonKey && candidateKey.includes('.')) {
    try {
      const parts = candidateKey.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload?.role === 'anon') {
          isAnonKey = true;
        }
      }
    } catch {}
  }

  if (isAnonKey) {
    if (!hasLoggedAnonError) {
      console.error(
        '[Supabase Sync Error] Only the Supabase anon/public key was detected. Backend synchronization requires the service_role key (SUPABASE_SERVICE_ROLE_KEY) to access tables protected by Row Level Security. Supabase sync has been disabled.'
      );
      hasLoggedAnonError = true;
    }
    return null;
  }

  return { url, key: candidateKey };
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
  if (!isSupabaseConfigured()) return false;
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
  email?: string;
  password_hash: string;
  role: string;
  display_name: string;
  stats_json: string;
  created_at: string;
}): void {
  if (!isSupabaseConfigured()) return;
  let parsedStats: any = {};
  try {
    parsedStats = JSON.parse(user.stats_json);
  } catch {
    parsedStats = {};
  }
  void supabaseRequest('users?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id: user.id,
      username: user.username,
      email: user.email || null,
      password_hash: user.password_hash,
      role: user.role,
      display_name: user.display_name,
      stats_json: parsedStats,
      created_at: user.created_at,
    },
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
  void supabaseRequest(`users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  }).catch((err) => {
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

export function syncInsertSession(_token: string, _userId: string, _role: string, _createdAt: string): void {
  // SEC-10: Sessions and tokens are strictly local and not synced to Supabase
}

export function syncDeleteSession(_token: string): void {
  // SEC-10: Sessions and tokens are strictly local and not synced to Supabase
}

export function syncInsertActiveExam(exam: {
  id: string;
  userId: string;
  title: string;
  questions: any[];
  startedAt: string;
  durationMinutes: number;
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
  // Sessions & reset tokens remain local-only; no remote cloud cleanup needed
}

export { supabaseRequest };
