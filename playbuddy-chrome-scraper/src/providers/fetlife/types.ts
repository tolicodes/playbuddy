import type { EventResult } from '../../types.js';

export type SkippedEntry = { reason: string; name?: string; url?: string; organizer?: string };
export type TableRowStatus = 'pending' | 'scraped' | 'skipped';
export type TableRow = {
    organizer?: string | null;
    name?: string | null;
    url?: string | null;
    status?: TableRowStatus;
    reason?: string | null;
    rsvps?: number | null;
    type?: string | null;
    date?: string | null;
};

export type FetlifeResult = EventResult & { skippedLog?: SkippedEntry[]; tableRows?: TableRow[] };
