-- ============================================================================
-- MedLab QBank — Supabase PostgreSQL Schema (9 Tables + Automatic Space Cleanup)
-- ============================================================================

-- 1. Permanent Question Bank
CREATE TABLE IF NOT EXISTS public.questions (
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
  data_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_unit ON public.questions(unit);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_code ON public.questions(code);

-- 2. Hierarchical Syllabus Categories (Unit -> Subject -> Topic)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  data_json JSONB NOT NULL
);

-- 3. Student Question Error Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  question_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id TEXT
);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 4. User Accounts & Performance Analytics
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  stats_json JSONB NOT NULL,
  created_at TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 1,
  email_verify_token_hash TEXT,
  email_verify_expires TEXT,
  google_sub TEXT
);

-- Safe migrations for existing Supabase deployments
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verify_token_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verify_expires TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON public.users(google_sub) WHERE google_sub IS NOT NULL;

-- 4b. Password Reset Tokens (1-hour TTL; SHA-256 hashed at rest)
CREATE TABLE IF NOT EXISTS public.password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Active Login Sessions (SHA-256 hashed token at rest; auto-deleted on logout or after 7 days)
CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip TEXT
);

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip TEXT;

-- 6. Active Timed Mock Exams (Auto-deleted upon submission or after 24 hours)
CREATE TABLE IF NOT EXISTS public.active_exams (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  questions_json JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  negative_marking INTEGER NOT NULL DEFAULT 0,
  penalty_per_wrong REAL NOT NULL DEFAULT 0.25,
  is_grand_test INTEGER NOT NULL DEFAULT 0,
  passing_percentage INTEGER NOT NULL DEFAULT 70
);

ALTER TABLE public.active_exams ADD COLUMN IF NOT EXISTS negative_marking INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.active_exams ADD COLUMN IF NOT EXISTS penalty_per_wrong REAL NOT NULL DEFAULT 0.25;
ALTER TABLE public.active_exams ADD COLUMN IF NOT EXISTS is_grand_test INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.active_exams ADD COLUMN IF NOT EXISTS passing_percentage INTEGER NOT NULL DEFAULT 70;

-- 7. Completed Exam Attempts & Leaderboard Records
CREATE TABLE IF NOT EXISTS public.exam_attempts (
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
  ON public.exam_attempts(is_grand_test, completed_at);

-- 8. Temporary PDF Extraction Staging Drafts (Auto-deleted upon import or after 7 days)
CREATE TABLE IF NOT EXISTS public.pdf_staging_drafts (
  id TEXT PRIMARY KEY,
  source_filename TEXT NOT NULL,
  drafts_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Uploaded Source PDFs for Traceability (Heavy binary/text auto-pruned after 14 days)
CREATE TABLE IF NOT EXISTS public.source_pdfs (
  filename TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  base64_data TEXT,
  text_content TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Automatic Self-Cleaning Function & Triggers to Save Free Storage Space
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_records()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Delete active exam sessions older than 24 hours
  DELETE FROM public.active_exams
  WHERE started_at < NOW() - INTERVAL '24 hours';

  -- 2. Delete login sessions older than 7 days
  DELETE FROM public.sessions
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- 2b. Delete expired password reset tokens
  DELETE FROM public.password_resets
  WHERE expires_at < NOW();

  -- 3. Delete unsubmitted PDF staging drafts unused for more than 7 days
  DELETE FROM public.pdf_staging_drafts
  WHERE updated_at < NOW() - INTERVAL '7 days';

  -- 4. Delete raw uploaded PDFs older than 14 days to save database storage space
  DELETE FROM public.source_pdfs
  WHERE uploaded_at < NOW() - INTERVAL '14 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_records()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.cleanup_expired_records();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_on_exam ON public.active_exams;
CREATE TRIGGER trg_cleanup_on_exam
AFTER INSERT ON public.active_exams
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_cleanup_expired_records();

DROP TRIGGER IF EXISTS trg_cleanup_on_session ON public.sessions;
CREATE TRIGGER trg_cleanup_on_session
AFTER INSERT ON public.sessions
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_cleanup_expired_records();

DROP TRIGGER IF EXISTS trg_cleanup_on_staging ON public.pdf_staging_drafts;
CREATE TRIGGER trg_cleanup_on_staging
AFTER INSERT OR UPDATE ON public.pdf_staging_drafts
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_cleanup_expired_records();

DROP TRIGGER IF EXISTS trg_cleanup_on_pdf ON public.source_pdfs;
CREATE TRIGGER trg_cleanup_on_pdf
AFTER INSERT OR UPDATE ON public.source_pdfs
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_cleanup_expired_records();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_staging_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Backend full access questions" ON public.questions;
CREATE POLICY "Backend full access questions" ON public.questions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access categories" ON public.categories;
CREATE POLICY "Backend full access categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access reports" ON public.reports;
CREATE POLICY "Backend full access reports" ON public.reports FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access users" ON public.users;
CREATE POLICY "Backend full access users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access password_resets" ON public.password_resets;
CREATE POLICY "Backend full access password_resets" ON public.password_resets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access sessions" ON public.sessions;
CREATE POLICY "Backend full access sessions" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access active_exams" ON public.active_exams;
CREATE POLICY "Backend full access active_exams" ON public.active_exams FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access exam_attempts" ON public.exam_attempts;
CREATE POLICY "Backend full access exam_attempts" ON public.exam_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access pdf_staging_drafts" ON public.pdf_staging_drafts;
CREATE POLICY "Backend full access pdf_staging_drafts" ON public.pdf_staging_drafts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Backend full access source_pdfs" ON public.source_pdfs;
CREATE POLICY "Backend full access source_pdfs" ON public.source_pdfs FOR ALL TO service_role USING (true) WITH CHECK (true);
