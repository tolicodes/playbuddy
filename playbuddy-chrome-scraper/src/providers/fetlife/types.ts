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

export type FriendResult = {
    root_handle: string;
    username: string;
    profile_url: string;
    image_url?: string | null;
    label?: string | null; // e.g. "55F Domme"
    location?: string | null;
    pics?: number | null;
    vids?: number | null;
    writings?: number | null;
    all_friends?: number | null;
    mutual_friends?: number | null;
    following?: number | null;
    followers?: number | null;
    score?: number | null; // all_friends + followers
    raw?: any;
};
