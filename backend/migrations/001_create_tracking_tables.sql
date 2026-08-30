-- ============================================================
-- VortieQ: Persistent Hackathon & Internship Tracking Tables
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. user_hackathons  (stores each user's hackathon tracking)
-- ─────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────
-- 2. user_internships  (stores each user's application tracking)
-- ─────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────
-- 3. Verify creation
-- ─────────────────────────────────────────────────────────────
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_hackathons', 'user_internships')
ORDER BY table_name;
