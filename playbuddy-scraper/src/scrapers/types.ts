import { SourceMetadata } from '../commonTypes.js';
export type ScraperParams = {
    url: string;
    sourceMetadata: SourceMetadata;
    urlCache?: string[];
};