-- Migration 005: reconcile the committed schema with what's actually live.
--
-- schema.sql only ever defined 5 tables (profiles, courses, learning_paths,
-- path_steps, feedback_events). Five more tables (resumes, ai_conversations,
-- ai_messages, user_settings, study_sessions) plus several columns on the
-- original 5 were added directly against the live database over the course
-- of this project, never captured in a migration file - so a clean database
-- could not be reproduced from what was committed (a real, confirmed audit
-- finding). Written to be safe on BOTH a fresh database (creates
-- everything) and the current live one (every statement here is a no-op
-- there) - verified against the live schema via the Supabase MCP tools
-- before writing this.

-- ── profiles: columns beyond the original schema.sql ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS topic_ratings JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detected_years_experience NUMERIC DEFAULT 0;

-- ── path_steps: columns beyond the original schema.sql ───────────────────────
ALTER TABLE path_steps
  ADD COLUMN IF NOT EXISTS prerequisite_step_ids UUID[],
  ADD COLUMN IF NOT EXISTS week_number INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── resumes (base table - migration 003 only ever added 3 columns to it,
-- assuming the table already existed, which it did, just never migrated) ────
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  extracted_topics JSONB DEFAULT '[]'::jsonb,
  detected_years_experience INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  education TEXT DEFAULT '',
  projects TEXT DEFAULT '',
  suggested_goal TEXT DEFAULT ''
);
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own resumes" ON resumes;
CREATE POLICY "own resumes" ON resumes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── ai_conversations / ai_messages (shared AI coach thread) ──────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own conversation" ON ai_conversations;
CREATE POLICY "own conversation" ON ai_conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  page_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own messages" ON ai_messages;
CREATE POLICY "own messages" ON ai_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── user_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_hours INTEGER DEFAULT 10,
  target_date DATE,
  email_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  ai_suggestions BOOLEAN DEFAULT true,
  preferred_formats TEXT[] DEFAULT ARRAY['course','video','article'],
  difficulty_preference TEXT DEFAULT 'adaptive' CHECK (difficulty_preference IN ('easier','adaptive','harder')),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own settings" ON user_settings;
CREATE POLICY "own settings" ON user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── study_sessions (real time-spent/activity log) ────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id UUID REFERENCES path_steps(id) ON DELETE SET NULL,
  activity TEXT NOT NULL DEFAULT 'task_completed' CHECK (activity IN ('task_completed','resource_opened','assessment','manual')),
  minutes INTEGER DEFAULT 0,
  activity_date DATE DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own sessions" ON study_sessions;
CREATE POLICY "own sessions" ON study_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── feedback_events: FK cascade fix (was NO ACTION on both - deleting a
-- path/step could be silently blocked by leftover feedback rows) ────────────
ALTER TABLE feedback_events DROP CONSTRAINT IF EXISTS feedback_events_path_id_fkey;
ALTER TABLE feedback_events ADD CONSTRAINT feedback_events_path_id_fkey
  FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE;

ALTER TABLE feedback_events DROP CONSTRAINT IF EXISTS feedback_events_step_id_fkey;
ALTER TABLE feedback_events ADD CONSTRAINT feedback_events_step_id_fkey
  FOREIGN KEY (step_id) REFERENCES path_steps(id) ON DELETE SET NULL;

-- ── explicit WITH CHECK (functionally identical to Postgres's own default
-- for FOR ALL policies with WITH CHECK omitted, restated explicitly) +
-- performance indexes ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own paths" ON learning_paths;
CREATE POLICY "own paths" ON learning_paths FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own feedback" ON feedback_events;
CREATE POLICY "own feedback" ON feedback_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own steps" ON path_steps;
CREATE POLICY "own steps" ON path_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM learning_paths lp WHERE lp.id = path_steps.path_id AND lp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM learning_paths lp WHERE lp.id = path_steps.path_id AND lp.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_learning_paths_user_status ON learning_paths(user_id, status);
CREATE INDEX IF NOT EXISTS idx_path_steps_path_seq ON path_steps(path_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_feedback_events_user ON feedback_events(user_id);

-- Sanity check after running:
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;
