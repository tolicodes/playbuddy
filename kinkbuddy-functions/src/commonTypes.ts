// only edit /common/types.ts
// These are copied

export interface Event extends SourceMetadata {
  id?: string;
  original_id?: string;
  organizer: {
    original_id?: string;

    name: string;
    url: string;
  };

  name: string;
  start_date: string;
  end_date: string;
  ticket_url: string;
  image_url: string;
  event_url: string;
  location: string;
  price: string;
  description: string;
  tags: string[];
}

export interface SourceMetadata {
  source_url?: string;
  timestamp_scraped?: number;

  // group id
  source_origination_group_id?: string;
  // group name
  source_origination_group_name?: string;
  // where it originated from
  source_origination_platform?: "WhatsApp" | "organizer_api";
  // the ticketing platform it's sold on
  source_ticketing_platform?: "Eventbrite" | "Plura" | "Partiful";
  dataset?: "Kink" | "Whatsapp POC";
}

// Organizer is another table
export type EventDBRecord = Omit<Event, "organizer"> & {
  organizer_id: string;
} & SourceMetadata;
