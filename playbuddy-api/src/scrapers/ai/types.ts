// src/scrapers/ai/types.ts
import type { NormalizedEventInput } from '../../commonTypes.js';

export type ScraperParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    nowISO?: string;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
};

export type DiscoverParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    nowISO?: string;
    maxEvents?: number;
    extractFromListPage?: boolean;
};

export type DiscoveredLink = {
    url: string;
    start_date?: string | null;
    source?: string | null;
};
