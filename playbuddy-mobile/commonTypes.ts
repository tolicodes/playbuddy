// only edit /common/commonTypes.ts 
// These are copied

export interface Event extends SourceMetadata {
    id: string;
    original_id?: string;
    organizer: {
        id: string;
        original_id?: string;

        name: string;
        url: string;
    }

    name: string;
    start_date: string;
    end_date: string;
    ticket_url: string;
    image_url: string;
    video_url?: string;
    event_url: string;
    location: string;
    price: string;
    description: string;
    tags: string[];
    type: 'event' | 'retreat'
    recurring: 'none' | 'weekly' | 'monthly'

    // for the map
    lat?: number;
    lon?: number;

    location_area?: {
        id: string;
        name: string;
        code: string;
    },

    communities?: [{
        id: string;
        name: string;
        code: string;
    }]
}

export interface SourceMetadata {
    source_url?: string;
    timestamp_scraped?: number;

    // group id
    source_origination_group_id?: string;
    // group name
    source_origination_group_name?: string;
    // where it originated from
    source_origination_platform?: "WhatsApp" | "organizer_api" | 'acrofestivals';
    // the ticketing platform it's sold on
    source_ticketing_platform?: "Eventbrite" | "Plura" | "Partiful";
    dataset?: "Kink" | "Whatsapp POC" | 'Acro';
}

// Organizer is another table
export type EventDBRecord = Omit<Event, "organizer"> & {
    organizer_id: string;
} & SourceMetadata;
