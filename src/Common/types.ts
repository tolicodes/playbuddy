export type Kink = {
  id: string;
  idea_title: string;
  idea_description: string;
  categories: string[];
  recommended?: boolean;
  status?: Status;
  level?: Level;
  is_group?: boolean;
  needs_supplies?: string;
};

export type Kinks = Kink[];

export enum Level {
  Easy = 'easy',
  Moderate = 'moderate',
  Advanced = 'advanced',
  Xxxtreme = 'xxxtreme',
}

export enum Status {
  Todo = 'todo',
  Done = 'done',
}

export const LEVELS = [
  { label: Level.Easy, color: '#4caf50' },
  { label: Level.Moderate, color: '#ff9800' },
  { label: Level.Advanced, color: '#f44336' },
  { label: Level.Xxxtreme, color: '#9e9e9e' },
];

const levelsToMap = (levels: typeof LEVELS) => {
  const remapped = levels.reduce(
    (acc, level) => {
      acc[level.label] = { ...level };
      return acc;
    },
    {} as Record<Level, (typeof LEVELS)[number]>,
  );
  return remapped;
};

export const LEVEL_MAP = levelsToMap(LEVELS);

export interface SourceMetadata {
  url?: string;
  timestamp_scraped?: number;

  // whatsapp group id
  source_origination_group_id?: string;
  // whatsapp group name
  source_origination_group_name?: string;
  // where it originated from
  source_origination_platform?: 'WhatsApp' | 'Unknown';
  // the ticketing platform it's sold on
  source_ticketing_platform?: 'Eventbrite' | 'Plura' | 'Partiful' | 'Unknown';
  dataset?: 'Kink' | 'Whatsapp POC'
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


export interface OptionType {
  label: string;
  value: string;
  color: string;
  count: number;
}

