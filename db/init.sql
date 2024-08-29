-- Create the organizer table
CREATE TABLE organizers (
    id SERIAL PRIMARY KEY,
    original_id TEXT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    aliases text array
);

ALTER TABLE organizers ADD CONSTRAINT unique_organizer_name UNIQUE (name);


-- Create the events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    original_id TEXT,
    organizer_id INT REFERENCES organizers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    event_url TEXT,
    ticket_url TEXT,
    image_url TEXT,
    location TEXT,
    price TEXT,
    description TEXT,
    tags TEXT[], -- Array of tags
    timestamp_scraped TIMESTAMP,
    source_url TEXT,
    source_origination_group_id TEXT,
    source_origination_group_name TEXT,
    source_origination_platform TEXT CHECK (source_origination_platform IN ('WhatsApp', 'organizer_api')),
    source_ticketing_platform TEXT CHECK (source_ticketing_platform IN ('Eventbrite', 'Plura', 'Partiful')),
    dataset TEXT CHECK (dataset IN ('Kink', 'Whatsapp POC'))
);

-- Optional: Create indexes to speed up common queries
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);


CREATE TABLE kinks (
    id SERIAL PRIMARY KEY,
    idea_title TEXT NOT NULL UNIQUE,
    level TEXT,
    materials_required TEXT,
    idea_description TEXT,
    categories text array,
    recommended BOOLEAN DEFAULT FALSE,
    status TEXT,
    to_do_priority TEXT,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);