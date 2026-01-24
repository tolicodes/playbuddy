-- Add per-import-source flag to skip existing events during scrapes
ALTER TABLE public.import_sources
  ADD COLUMN IF NOT EXISTS skip_existing boolean;

-- Default gmail sources to skip existing events unless explicitly overridden
UPDATE public.import_sources
SET skip_existing = true
WHERE skip_existing IS NULL
  AND (source = 'gmail' OR method = 'gmail');
