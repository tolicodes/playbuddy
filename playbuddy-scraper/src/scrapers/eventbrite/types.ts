export interface EventbriteEvent {
    id: string;
    name: {
        text: string;
    };
    url: string;
    start: {
        utc: string;
        timezone: string;
        local: string;
    };
    end: {
        timezone: string;
        local: string;
        utc: string;
    };
    logo: {
        url: string;
        edge_color: string;
    };
    organizer: {
        id: string;
        name: string;
        url: string;
        organization_id: string;
        user_id: string;
    };
    venue: {
        id: string;
        name: string;
        address: {
            city: string;
            country: string;
            region: string;
            longitude: string;
            latitude: string;
            localized_address_display: string;
        };
    };
    ticket_availability: {
        is_free: boolean;
        minimum_ticket_price: {
            currency: string;
            major_value: string;
            value: number;
            display: string;
        };
        maximum_ticket_price: {
            currency: string;
            major_value: string;
            value: number;
            display: string;
        };
    };
    description: {
        text: string;
        html: string;
    };
    category: {
        id: string;
        name: string;
        short_name: string;
    };
    subcategory_id: string;
    tags?: Array<{ display_name: string }>;  // This field is not in the provided JSON, but was in your previous example
    summary: string;
    is_free: boolean;
    currency: string;
    online_event: boolean;
    listed: boolean;
    shareable: boolean;
    source: string;
    status: string;
    format: {
        id: string;
        name: string;
        short_name: string;
    };
    inventory_type: string;
    is_series: boolean;
    is_series_parent: boolean;
    hide_end_date: boolean;
    show_pick_a_seat: boolean;
    show_seatmap_thumbnail: boolean;
    show_colors_in_seatmap_thumbnail: boolean;
    is_protected_event: boolean;
    is_externally_ticketed: boolean;
    locale: string;
    language: string;
    organization_id: string;
    created?: string;  // This field is not in the provided JSON, but might be useful
    changed?: string;  // This field is not in the provided JSON, but might be useful
    published: string;
    price_range: string;
}
