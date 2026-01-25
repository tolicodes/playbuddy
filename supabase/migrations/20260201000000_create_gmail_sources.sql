CREATE TABLE IF NOT EXISTS public.gmail_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_email text NOT NULL UNIQUE,
  event_status text NOT NULL DEFAULT 'pending' CHECK (event_status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gmail_sources IS 'Email inboxes that feed the Gmail scraper.';
COMMENT ON COLUMN public.gmail_sources.source_email IS 'Gmail address to scan for event emails.';
COMMENT ON COLUMN public.gmail_sources.event_status IS 'Desired default approval status (forced to pending in API).';

ALTER TABLE public.gmail_sources ENABLE ROW LEVEL SECURITY;
