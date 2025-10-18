// src/scrapers/ai/types.ts
import type { NormalizedEventInput } from '../../commonTypes.js';

export type ScraperParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    nowISO?: string;
};

export type DiscoverParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    nowISO?: string;
    maxEvents?: number;
};

export type DiscoveredLink = {
    url: string;
    approx_start_time?: string | null;
    title?: string | null;
    source_hint?: string | null;
};
