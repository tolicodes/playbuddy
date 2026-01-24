ALTER TABLE public.organizers
    ADD COLUMN IF NOT EXISTS vetted boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS vetted_instructions text;
