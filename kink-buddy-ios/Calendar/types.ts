export type SourceMetadata = {
    source_origination_group_id?: string;
    source_origination_group_name?: string;
    source_origination_platform?: 'WhatsApp' | 'Unknown';
    source_ticketing_platform?: 'Eventbrite' | 'Plura' | 'Partiful' | 'Unknown';
    dataset?: 'Kink' | 'Whatsapp POC';
};

export type Event = {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    location: string;
    price: string;
    imageUrl: string;
    organizer: string;
    organizerUrl: string;
    eventUrl: string;
    summary: string;
    tags: string[];
    min_ticket_price: string;
    max_ticket_price: string;
};