// Define the structure of the event object
export interface Event {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    timezone: string;
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
    source: 'Eventbrite' | 'Plura';
}