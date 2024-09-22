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


CREATE TABLE event_wishlist (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
    event_id int4 REFERENCES events (id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT current_timestamp
);


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Generate unique ID for each row
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Foreign key linking to auth.users
    share_code TEXT, -- Custom column for share_code
    created_at TIMESTAMP DEFAULT NOW() -- Timestamp for when the user was created
);


-- Assuming the 'events' table exists with at least an 'id' column
-- Create the 'classifications' table
CREATE TABLE classifications (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    event_type TEXT,
    comfort_level TEXT,
    experience_level TEXT,
    inclusivity TEXT,
    consent_and_safety_policies TEXT[],
    alcohol_and_substance_policies TEXT[],
    venue_type TEXT,
    interactivity_level TEXT,
    dress_code TEXT[],
    accessibility TEXT[],
    event_themes TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

ALTER TABLE classifications
ADD CONSTRAINT unique_event_id UNIQUE (event_id);

-- Optional: Create triggers to update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_classifications_updated_at
BEFORE UPDATE ON classifications
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Alter the 'events' table with alternative column names
ALTER TABLE events
ADD COLUMN approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN vetted BOOLEAN DEFAULT FALSE,
ADD COLUMN classification_status TEXT CHECK (classification_status IN ('queued', 'auto_classified', 'admin_classified'));


