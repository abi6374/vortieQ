-- 015_hackathon_internship_tracking.sql
--
-- Persistent hackathon/internship application tracking (a separate
-- feature area from the learning-path/mastery/catalog work in the rest
-- of this migration sequence - the frontend's Hackathons/Internships
-- pages already reference these tables; this creates them).
--
-- Purely additive: CREATE TABLE IF NOT EXISTS, an index, a shared
-- updated_at trigger function, and per-row RLS scoped to the owning
-- user (auth.uid() = user_id) on both tables. Verified against the live
-- schema before applying: neither table existed yet, and
-- public.update_updated_at_column did not already exist (a
-- storage.update_updated_at_column exists in Supabase's own internal
-- `storage` schema, unrelated - no collision since this one is
-- explicitly created in `public`).
--
-- Rollback: `DROP TABLE IF EXISTS public.user_hackathons, public.user_internships;
-- DROP FUNCTION IF EXISTS public.update_updated_at_column();` - safe at
-- any time these tables hold no data a user would miss; check for real
-- rows first if this has been live for a while.

CREATE TABLE IF NOT EXISTS public.user_hackathons (
    id                uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hackathon_id      text         NOT NULL,
    status            text         NOT NULL DEFAULT 'registered'
                                   CHECK (status IN ('registered', 'interested', 'submitted')),
    registration_date timestamptz  DEFAULT now(),
    created_at        timestamptz  DEFAULT now(),
    updated_at        timestamptz  DEFAULT now(),
    UNIQUE (user_id, hackathon_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hackathons_user_id
    ON public.user_hackathons (user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_hackathons_updated_at ON public.user_hackathons;
CREATE TRIGGER trg_user_hackathons_updated_at
    BEFORE UPDATE ON public.user_hackathons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_hackathons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own hackathon registrations" ON public.user_hackathons;
CREATE POLICY "Users manage own hackathon registrations"
    ON public.user_hackathons
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


CREATE TABLE IF NOT EXISTS public.user_internships (
    id                 uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id            uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    internship_id      text         NOT NULL,
    application_status text         NOT NULL DEFAULT 'applied'
                                    CHECK (application_status IN ('applied', 'saved', 'interviewing', 'offer', 'rejected')),
    applied_on         timestamptz  DEFAULT now(),
    created_at         timestamptz  DEFAULT now(),
    updated_at         timestamptz  DEFAULT now(),
    UNIQUE (user_id, internship_id)
);

CREATE INDEX IF NOT EXISTS idx_user_internships_user_id
    ON public.user_internships (user_id);

DROP TRIGGER IF EXISTS trg_user_internships_updated_at ON public.user_internships;
CREATE TRIGGER trg_user_internships_updated_at
    BEFORE UPDATE ON public.user_internships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own internship applications" ON public.user_internships;
CREATE POLICY "Users manage own internship applications"
    ON public.user_internships
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
