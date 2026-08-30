-- 017_transactional_rpcs.sql
--
-- Database-reliability audit: "ensure path generation, feedback, swap,
-- rerecommendation, completion, mastery updates, recommendation-run
-- creation, and version increments are atomic."
--
-- Root cause confirmed by reading the actual service code (not assumed):
-- every one of these mutations is currently a SEQUENCE of independent
-- supabase-py `.execute()` calls from Python. Each call is its own
-- implicit Postgres transaction - there is no multi-statement transaction
-- boundary the client SDK can express (PostgREST commits per-request), so
-- a crash/timeout between two calls leaves whatever the first call already
-- committed. Confirmed concrete failure modes this closes:
--
--  1. path_service.generate_path(): inserted the learning_paths row, then
--     looped one INSERT per path_step. A failure partway through the loop
--     (network blip, one bad course_id) leaves an `active` path with only
--     SOME of its steps - a real half-created path silently served to the
--     learner as if complete.
--  2. path_service.swap_step(): bumped every later step's sequence_order
--     with N sequential single-row UPDATEs, then a separate UPDATE (mark
--     skipped), then a separate INSERT (the replacement). A crash midway
--     leaves duplicate or gapped sequence_order values with no step
--     actually replaced.
--  3. roadmap_service.bump_path_version(): SELECT version, compute +1 in
--     Python, then UPDATE. A classic lost-update race - two concurrent
--     mutations on the same path (two tabs, or a fast double-click) can
--     both read the same version and both write the same "+1", losing one
--     increment entirely. Confirmed exploitable, see
--     tests/test_concurrent_mutations.py.
--  4. mastery_service._upsert_mastery(): same SELECT-then-compute-then-
--     UPSERT race, on learner_skill_mastery - concurrent evidence writes
--     for the same (user_id, skill_id) (e.g. resume + GitHub analysis
--     both running during onboarding) can lose one observation.
--  5. feedback_service._regenerate_tail(): deleted the not-started tail of
--     the path FIRST, then made LLM calls and inserted replacements
--     afterward. A failure after the delete but before all inserts land
--     permanently loses path steps, and the function's own comment already
--     acknowledged this ("tail already deleted, but the frontend will just
--     render fewer steps") as an accepted, undesirable outcome rather than
--     something actually fixed.
--
-- Fix: one Postgres function per mutation, called via .rpc(...) instead of
-- several sequential .table(...) calls - a plpgsql function body runs
-- inside ONE transaction, so an exception anywhere inside it rolls back
-- everything the function did. Depends on path_steps_path_seq_uniq being
-- DEFERRABLE INITIALLY DEFERRED (016_integrity_hardening.sql) so the
-- set-based sequence_order shifts below don't hit a transient
-- uniqueness violation mid-statement.
--
-- Security: every function below is SECURITY INVOKER (the default - no
-- SECURITY DEFINER anywhere in this file). The backend always calls these
-- with the service-role key, which already has full table access with RLS
-- bypassed, so there is no privilege this needs to borrow. Postgres grants
-- EXECUTE on a new function to PUBLIC by default, and Supabase's PostgREST
-- layer auto-exposes every public-schema function as an RPC endpoint - so
-- without an explicit REVOKE, the anon/authenticated roles could call
-- these directly from the frontend, completely bypassing this app's own
-- ownership/auth checks (which live in the Python layer, not in these
-- functions beyond one defensive ownership check in swap_path_step). Every
-- function here explicitly revokes PUBLIC/anon/authenticated execute and
-- grants only service_role.

-- ── 1. Atomic path creation: archive-prior-active + insert path + insert
-- every step, all or nothing. ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_learning_path_with_steps(
  p_user_id UUID,
  p_goal_text TEXT,
  p_steps JSONB  -- ordered array of {course_id, milestone_label, explanation}
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_path_id UUID;
BEGIN
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'p_steps must be a non-empty JSON array';
  END IF;

  UPDATE public.learning_paths
    SET status = 'archived'
    WHERE user_id = p_user_id AND status = 'active';

  INSERT INTO public.learning_paths (user_id, goal_text, status)
  VALUES (p_user_id, p_goal_text, 'active')
  RETURNING id INTO v_path_id;

  INSERT INTO public.path_steps (path_id, course_id, sequence_order, milestone_label, explanation, status)
  SELECT v_path_id, (elem->>'course_id')::UUID, ord::int, elem->>'milestone_label', elem->>'explanation', 'not_started'
  FROM jsonb_array_elements(p_steps) WITH ORDINALITY AS t(elem, ord);

  RETURN v_path_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_learning_path_with_steps(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_learning_path_with_steps(UUID, TEXT, JSONB) TO service_role;

-- ── 2. Atomic version bump: a single UPDATE...RETURNING instead of
-- SELECT-then-compute-then-UPDATE. Postgres's own row lock during the
-- UPDATE serializes concurrent callers correctly with no lost increments -
-- this is the entire fix, no explicit locking needed because it's already
-- one statement. ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_path_version(p_path_id UUID)
RETURNS TABLE(version INT, last_recomputed_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.learning_paths lp
    SET version = lp.version + 1,
        last_recomputed_at = now()
    WHERE lp.id = p_path_id
    RETURNING lp.version, lp.last_recomputed_at;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_path_version(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_path_version(UUID) TO service_role;

-- ── 3. Atomic single-step swap: bump every later sequence_order (one
-- set-based UPDATE, not N sequential ones), mark the old step skipped, and
-- insert the replacement - together or not at all. Re-verifies ownership
-- itself (defense in depth beyond the Python-layer check that already runs
-- before this is called), and locks the target row (FOR UPDATE) so two
-- concurrent swaps of the SAME step can't both proceed. ──────────────────
CREATE OR REPLACE FUNCTION public.swap_path_step(
  p_step_id UUID,
  p_user_id UUID,
  p_new_course_id UUID,
  p_explanation TEXT
) RETURNS TABLE(new_step_id UUID, new_sequence_order INT, milestone_label TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_path_id UUID;
  v_old_seq INT;
  v_milestone TEXT;
  v_new_id UUID;
BEGIN
  SELECT ps.path_id, ps.sequence_order, ps.milestone_label
    INTO v_path_id, v_old_seq, v_milestone
  FROM public.path_steps ps
  JOIN public.learning_paths lp ON lp.id = ps.path_id
  WHERE ps.id = p_step_id AND lp.user_id = p_user_id
  FOR UPDATE OF ps;

  IF v_path_id IS NULL THEN
    RAISE EXCEPTION 'Step not found or access denied';
  END IF;

  UPDATE public.path_steps
    SET sequence_order = sequence_order + 1
    WHERE path_id = v_path_id AND sequence_order > v_old_seq;

  UPDATE public.path_steps SET status = 'skipped' WHERE id = p_step_id;

  INSERT INTO public.path_steps (path_id, course_id, sequence_order, milestone_label, status, explanation)
  VALUES (v_path_id, p_new_course_id, v_old_seq + 1, v_milestone, 'not_started', p_explanation)
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, v_old_seq + 1, v_milestone;
END;
$$;
REVOKE ALL ON FUNCTION public.swap_path_step(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.swap_path_step(UUID, UUID, UUID, TEXT) TO service_role;

-- ── 4. Atomic tail rebuild: delete the not-started tail and insert its
-- replacement together. Deliberately a no-op (deletes nothing) when
-- p_new_steps is empty - the Python caller now does every LLM/network call
-- BEFORE invoking this, so an LLM failure leaves the existing tail
-- completely untouched instead of the old behavior (delete first, figure
-- out the replacement after - see the file header for the real data-loss
-- mode this replaces). ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rebuild_path_tail(
  p_path_id UUID,
  p_new_steps JSONB  -- ordered array of {course_id, milestone_label, explanation}
) RETURNS SETOF public.path_steps
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_seq INT;
BEGIN
  IF p_new_steps IS NULL OR jsonb_typeof(p_new_steps) <> 'array' OR jsonb_array_length(p_new_steps) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.path_steps WHERE path_id = p_path_id AND status = 'not_started';

  SELECT COALESCE(MAX(ps.sequence_order), 0) INTO v_next_seq
  FROM public.path_steps ps WHERE ps.path_id = p_path_id;

  RETURN QUERY
  INSERT INTO public.path_steps (path_id, course_id, sequence_order, milestone_label, explanation, status)
  SELECT p_path_id, (elem->>'course_id')::UUID, v_next_seq + ord::int, elem->>'milestone_label', elem->>'explanation', 'not_started'
  FROM jsonb_array_elements(p_new_steps) WITH ORDINALITY AS t(elem, ord)
  RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.rebuild_path_tail(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_path_tail(UUID, JSONB) TO service_role;

-- ── 5. Atomic mastery evidence combine+upsert. Replaces a SELECT-then-
-- compute-then-UPSERT race with a row-locked (FOR UPDATE) read inside the
-- same transaction as the write, so two concurrent evidence writes for the
-- same (user_id, skill_id) serialize correctly instead of one silently
-- clobbering the other. The confidence-weighted-average formula is copied
-- verbatim from mastery_service._combine() - same math, now atomic. ──────
CREATE OR REPLACE FUNCTION public.upsert_mastery_evidence(
  p_user_id UUID,
  p_skill_id UUID,
  p_new_mastery NUMERIC,
  p_new_confidence NUMERIC,
  p_source TEXT,
  p_note TEXT DEFAULT '',
  p_target_level NUMERIC DEFAULT NULL
) RETURNS TABLE(mastery_probability NUMERIC, confidence NUMERIC, decay_version INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_mastery NUMERIC;
  v_old_confidence NUMERIC;
  v_old_decay INT;
  v_total_weight NUMERIC;
  v_combined_mastery NUMERIC;
  v_combined_confidence NUMERIC;
  v_new_mastery NUMERIC := GREATEST(0.0, LEAST(1.0, p_new_mastery));
  v_new_confidence NUMERIC := GREATEST(0.0, LEAST(1.0, p_new_confidence));
BEGIN
  SELECT lsm.mastery_probability, lsm.confidence, lsm.decay_version
    INTO v_old_mastery, v_old_confidence, v_old_decay
  FROM public.learner_skill_mastery lsm
  WHERE lsm.user_id = p_user_id AND lsm.skill_id = p_skill_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_combined_mastery := v_new_mastery;
    v_combined_confidence := v_new_confidence;
    v_old_decay := 0;
  ELSE
    v_total_weight := v_old_confidence + v_new_confidence;
    IF v_total_weight <= 0 THEN
      v_combined_mastery := v_new_mastery;
    ELSE
      v_combined_mastery := (v_old_mastery * v_old_confidence + v_new_mastery * v_new_confidence) / v_total_weight;
    END IF;
    v_combined_confidence := LEAST(1.0, v_old_confidence + v_new_confidence * (1 - v_old_confidence));
  END IF;

  INSERT INTO public.learner_skill_mastery
    (user_id, skill_id, mastery_probability, confidence, evidence_source, evidence_note, target_level, observed_at, decay_version)
  VALUES
    (p_user_id, p_skill_id, ROUND(v_combined_mastery, 4), ROUND(v_combined_confidence, 4), p_source, LEFT(COALESCE(p_note, ''), 500),
     CASE WHEN p_target_level IS NULL THEN NULL ELSE GREATEST(0.0, LEAST(1.0, p_target_level)) END,
     now(), v_old_decay + 1)
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    mastery_probability = EXCLUDED.mastery_probability,
    confidence = EXCLUDED.confidence,
    evidence_source = EXCLUDED.evidence_source,
    evidence_note = EXCLUDED.evidence_note,
    target_level = COALESCE(EXCLUDED.target_level, public.learner_skill_mastery.target_level),
    observed_at = EXCLUDED.observed_at,
    decay_version = EXCLUDED.decay_version;

  RETURN QUERY SELECT ROUND(v_combined_mastery, 4), ROUND(v_combined_confidence, 4), (v_old_decay + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_mastery_evidence(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_mastery_evidence(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, NUMERIC) TO service_role;

-- ── 6. Atomic completed_courses toggle: replaces a SELECT array, modify in
-- Python, UPDATE whole-array race in roadmap_service.set_task_completion /
-- feedback_service._append_completed_course with one array-expression
-- UPDATE Postgres can serialize on its own row lock. ─────────────────────
CREATE OR REPLACE FUNCTION public.set_course_completion_flag(
  p_user_id UUID, p_course_id UUID, p_done BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles p
  SET completed_courses = CASE
    WHEN p_done THEN (
      SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::text[])
      FROM unnest(COALESCE(p.completed_courses, ARRAY[]::text[]) || ARRAY[p_course_id::text]) AS x
    )
    ELSE array_remove(COALESCE(p.completed_courses, ARRAY[]::text[]), p_course_id::text)
  END
  WHERE p.id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_course_completion_flag(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_course_completion_flag(UUID, UUID, BOOLEAN) TO service_role;
