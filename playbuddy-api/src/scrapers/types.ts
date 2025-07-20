import { NormalizedEventInput } from '../commonTypes.js';
export type ScraperParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
};