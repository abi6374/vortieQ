-- Migration 008: recommendation run audit log + per-candidate explanations,
-- plus path versioning for freshness/targeted-recompute.

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL,  -- 'path_generate' | 'swap' | 'rerecommend'
  input_snapshot_hash TEXT NOT NULL,
  candidate_course_ids UUID[] DEFAULT ARRAY[]::UUID[],
  hard_filter_reasons JSONB DEFAULT '{}'::jsonb,
  scoring_version TEXT NOT NULL,
  weights JSONB NOT NULL,
  final_course_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommendation_runs_user ON recommendation_runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_run_id UUID NOT NULL REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  total_score NUMERIC NOT NULL,
  feature_scores JSONB NOT NULL,  -- {"relevance": 0.8, "skill_gap_coverage": 0.6, ...}
  selected BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_recommendation_explanations_run ON recommendation_explanations(recommendation_run_id);

ALTER TABLE recommendation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own recommendation runs" ON recommendation_runs;
CREATE POLICY "own recommendation runs" ON recommendation_runs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE recommendation_explanations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own recommendation explanations" ON recommendation_explanations;
CREATE POLICY "own recommendation explanations" ON recommendation_explanations FOR ALL
  USING (EXISTS (SELECT 1 FROM recommendation_runs r WHERE r.id = recommendation_explanations.recommendation_run_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recommendation_runs r WHERE r.id = recommendation_explanations.recommendation_run_id AND r.user_id = auth.uid()));

-- Path version + freshness timestamp, so clients can cheaply detect staleness
-- (poll/compare version) instead of a full recompute/refetch every time, and
-- always know how fresh what they're looking at is (see roadmap_service's
-- targeted recompute + the GET /api/roadmap response's freshness field).
ALTER TABLE learning_paths
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_recomputed_at TIMESTAMPTZ DEFAULT now();
