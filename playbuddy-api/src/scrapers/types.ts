import { NormalizedEventInput } from '../commonTypes.js';

export type ScrapeSkipReason = {
    url: string;
    reason: string;
    detail?: string;
    source?: string;
};
export type ScraperParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
    onSkip?: (skip: ScrapeSkipReason) => void;
};
