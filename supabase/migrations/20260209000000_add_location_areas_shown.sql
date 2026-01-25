ALTER TABLE public.location_areas
  ADD COLUMN IF NOT EXISTS shown boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.location_areas.shown IS 'Whether this location area is shown in onboarding.';
