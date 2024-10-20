// only edit /common/commonTypes.ts 
// These are copied

export type Organizer = {
    id: string;
    original_id?: string;
    name: string;
    url: string;
}

export type LocationArea = {
    id: string;
    name: string;
    code: string;
}

export type Community = {
    id: string;
    name: string;
    code: string;
}

export interface Event extends SourceMetadata {
    id: string;
    original_id?: string;
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

    // these reference other tables
    // organizer_id

    organizer: Organizer;
    // location_area_id

    location_area?: LocationArea;
    // community_ids (many to many via join table event_communities)
    communities?: Community[];
}

export interface SourceMetadata {
    source_url?: string;
    timestamp_scraped?: number;
    dataset?: "Kink" | "Whatsapp POC" | 'Acro';

    // where it originated from
    source_origination_platform?: "WhatsApp" | "organizer_api" | 'acrofestivals' | 'facebook';

    // the ticketing platform it's sold on
    source_ticketing_platform?: "Eventbrite" | "Plura" | "Partiful";

    // group id
    source_origination_group_id?: string;
    // group name
    source_origination_group_name?: string;


    // Fields
    communities?: {
        id: string;
    }[]

}


// either pass an id or inputs to create a new one
export type CreateOrganizerInput = { original_id?: string; name: string; url: string } | { id: string }


// we could omit a location name and it will use the code instead

export type CreateLocationAreaInput = { code: string; name?: string } | { id: string }
export type CreateCommunityInput = { name?: string; code: string } | { id: string }

// We don't want to include id in the create input
export type CreateEventInput = Omit<Event,
    "id" | "organizer" | "location_area" | "communities"
> & {
    organizer: CreateOrganizerInput;
    location_area?: CreateLocationAreaInput;
    communities?: CreateCommunityInput[];
} & SourceMetadata
