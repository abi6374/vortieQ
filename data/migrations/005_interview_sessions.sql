-- Migration 005: AI Interview session persistence and evaluation history.
--
-- Persists multi-turn interview sessions, grounded in the learner's active
-- learning path, along with question/answer transcripts, Amazon Bedrock
-- evaluations, and recommended next learning steps.
--
-- Purely additive with RLS enabled.

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  path_id             UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  target_role         TEXT,
  current_milestone   TEXT,
  status              TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  question_count      INT DEFAULT 5,
  overall_score       INT,
  verdict             TEXT,
  summary             TEXT,
  scores              JSONB,
  strengths           JSONB,
  skill_gaps          JSONB,
  recommended_topics  JSONB,
  duration_sec        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interview_qa_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_number     INT NOT NULL,
  category            TEXT,
  question_text       TEXT NOT NULL,
  difficulty          TEXT DEFAULT 'medium',
  skill_focus         TEXT,
  candidate_transcript TEXT,
  score               INT,
  strengths           JSONB,
  missing_concepts    JSONB,
  feedback            TEXT,
  duration_sec        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_qa_records ENABLE ROW LEVEL SECURITY;

-- Users can only read & insert/update their own interview sessions
CREATE POLICY "Users can manage their own interview sessions"
  ON interview_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage QA records for their own sessions"
  ON interview_qa_records
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM interview_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM interview_sessions WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_qa_session_id ON interview_qa_records(session_id);
