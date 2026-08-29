-- Migration 004: persist the GitHub connection as a real column, not just
-- browser localStorage.
--
-- Context: the Account page, the roadmap popup's onboarding intake, and
-- LearnerIntakeWorkspace each derived "which GitHub username is connected"
-- from a different, unsynced source (localStorage keyed per-browser,
-- user_metadata.user_name from a native GitHub OAuth login, or ephemeral
-- component state from the current onboarding session) - so re-syncing a
-- different handle in one place could leave another place still showing
-- the old one. profiles.github_username is now the single source of truth,
-- written atomically by routers/github.py's ingest_github_profile on every
-- successful sync and read everywhere instead of the scattered heuristics.
--
-- github_repos_summary stores the real analyzed project list (name,
-- description, language, complexity, stars, url - the same shape
-- analyze_github_repositories() already returns as "github_projects") so
-- the roadmap-generation prompt can reference concrete verified projects,
-- not just the derived topic_ratings skill list.
--
-- Safe to run on the live DB: purely additive, both nullable, no default
-- required (NULL correctly means "never connected" - never fabricate a
-- fake empty-string username). Existing rows are unaffected.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS github_username      TEXT,
  ADD COLUMN IF NOT EXISTS github_repos_summary JSONB;

-- Sanity check after running:
-- SELECT id, github_username, github_repos_summary FROM profiles LIMIT 5;
