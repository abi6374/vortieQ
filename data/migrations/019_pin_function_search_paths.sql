-- 019_pin_function_search_paths.sql
--
-- Supabase's own security advisor, run immediately after applying
-- 016/017/018, flagged every new plpgsql function (the 6 RPCs plus
-- touch_path_step) as "Function Search Path Mutable" - without an explicit
-- search_path, a function is vulnerable to search-path hijacking if a
-- malicious schema were ever added ahead of `public` in the calling
-- session's search_path. Low realistic risk here (every one of these is
-- SECURITY INVOKER, called only by the backend's own service-role
-- connection - see 017's file header), but pinning it is a one-line,
-- zero-behavior-change fix, so there is no reason not to. ALTER FUNCTION
-- ... SET search_path does not change what the function does, only where
-- unqualified identifiers resolve from.
ALTER FUNCTION public.touch_path_step() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_learning_path_with_steps(UUID, TEXT, JSONB) SET search_path = public, pg_temp;
ALTER FUNCTION public.bump_path_version(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.swap_path_step(UUID, UUID, UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.rebuild_path_tail(UUID, JSONB) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_mastery_evidence(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, NUMERIC) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_course_completion_flag(UUID, UUID, BOOLEAN) SET search_path = public, pg_temp;

-- Same fix for the pre-existing functions the advisor also flagged
-- (created in schema.sql / migration 015, before this audit) - equally
-- safe, equally zero-behavior-change.
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.match_courses(VECTOR(384), INT) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- Not fixed here, deliberately (see the database-reliability audit report
-- for the full reasoning):
--  - "Extension `vector` installed in the public schema" - pre-existing,
--    moving it requires recreating the extension and is a real risk to
--    every embedding-typed column; out of scope for this pass.
--  - "Leaked password protection disabled" - a Supabase Auth dashboard
--    toggle, not a schema change; recommended as a manual follow-up.
