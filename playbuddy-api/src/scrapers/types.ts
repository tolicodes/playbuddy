import { NormalizedEventInput } from '../commonTypes.js';
import type { HtmlScrapeCapture } from './helpers/htmlScrapeStore.js';

export type ScrapeSkipReason = {
    url: string;
    reason: string;
    detail?: string;
    source?: string;
    stage?: 'scrape' | 'upsert';
    level?: 'error' | 'warn' | 'info';
    eventName?: string;
    eventId?: string;
};
export type ScraperParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
    onSkip?: (skip: ScrapeSkipReason) => void;
    captureHtml?: HtmlScrapeCapture;
};
