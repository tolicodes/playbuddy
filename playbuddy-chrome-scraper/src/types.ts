export interface EventResult {
    name?: string | null;
    rawDatetime?: string | null;
    location?: string | null;
    category?: string | null;
    description?: string | null;
    description_html?: string | null;
    ticket_url?: string | null;
    fetlife_handle?: string | null;
    instagram_handle?: string | null;
    organizer_href?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    image_url?: string | null;
    rsvp_count?: number | null;
    error?: string;
}

export interface InstagramLink {
    url: string;
    name: string;
    handle: string;
}

export interface Link {
    url: string;
    name: string;
    handle: string;
}
