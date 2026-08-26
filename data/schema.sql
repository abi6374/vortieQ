-- Supabase schema for AI Learning Path Recommender
-- Run in Supabase Dashboard → SQL Editor → New Query → Run

-- Step 1: Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Learner profiles (linked to Supabase auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  goal_text TEXT,
  target_role TEXT,
  current_level TEXT CHECK (current_level IN ('beginner','intermediate','advanced')),
  interests TEXT[],
  weekly_hours INT DEFAULT 10,
  completed_courses TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Course resource library (seeded with 80 courses)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  provider TEXT,
  skill_tags TEXT[],
  difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  duration_hrs INT,
  prerequisites TEXT[],
  resource_url TEXT,
  embedding VECTOR(384)
);

-- Step 4: Generated learning paths per user
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_text TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Individual steps within a path
CREATE TABLE path_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  sequence_order INT NOT NULL,
  milestone_label TEXT,
  status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','skipped')),
  explanation TEXT,
  prerequisite_step_ids UUID[]
);

-- Step 6: Learner feedback events
CREATE TABLE feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  path_id UUID REFERENCES learning_paths(id),
  step_id UUID REFERENCES path_steps(id),
  event_type TEXT CHECK (event_type IN ('completed','too_easy','not_interested')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Row Level Security (each user only sees their own data)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own paths" ON learning_paths FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own steps" ON path_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM learning_paths lp
          WHERE lp.id = path_steps.path_id AND lp.user_id = auth.uid())
);
CREATE POLICY "own feedback" ON feedback_events FOR ALL USING (auth.uid() = user_id);

-- Step 8: Vector similarity search function
CREATE OR REPLACE FUNCTION match_courses(
  query_embedding VECTOR(384),
  match_count INT DEFAULT 15
)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT,
  skill_tags TEXT[], difficulty TEXT,
  duration_hrs INT, prerequisites TEXT[],
  resource_url TEXT, similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT id, title, description, skill_tags, difficulty,
         duration_hrs, prerequisites, resource_url,
         1 - (embedding <=> query_embedding) AS similarity
  FROM courses
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Step 9: Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
