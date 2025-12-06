import { NormalizedEventInput } from '../../commonTypes.js';
import { ScraperParams } from '../types.js';
import { aiDiscoverAndScrapeFromUrl } from './discovery.js';
import { aiScrapeEventsFromUrl } from './single.js';

/**
 * Decide single vs multi via AI:
 * 1) Try discovery (multi-event); if it returns any events, use them.
 * 2) Otherwise fall back to single-event scrape.
 */
export const aiAutoScrapeUrl = async ({ url, eventDefaults }: ScraperParams): Promise<NormalizedEventInput[]> => {
    try {
        const multi = await aiDiscoverAndScrapeFromUrl({ url, eventDefaults });
        if (multi && multi.length) return multi;
    } catch (err) {
        console.error('[ai-auto] discovery failed', url, err);
    }

    try {
        const single = await aiScrapeEventsFromUrl({ url, eventDefaults });
        return single || [];
    } catch (err) {
        console.error('[ai-auto] single scrape failed', url, err);
        return [];
    }
};

export default aiAutoScrapeUrl;
