import { SourceMetadata } from '../commonTypes';
export type ScraperParams = {
    url: string;
    sourceMetadata: SourceMetadata;
    urlCache?: string[];
};