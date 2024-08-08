export interface SourceMetadata {
  url?: string;
  timestamp_scraped?: number;

  // group id
  source_origination_group_id?: string;
  // group name
  source_origination_group_name?: string;
  // where it originated from
  source_origination_platform?: 'WhatsApp';
  // the ticketing platform it's sold on
  source_ticketing_platform?: 'Eventbrite' | 'Plura' | 'Partiful';
}

// Define the structure of the event object
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
} & SourceMetadata;
