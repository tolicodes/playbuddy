ALTER TABLE public.location_areas
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN public.location_areas.timezone
  IS 'IANA timezone for the location area (e.g., America/New_York).';
