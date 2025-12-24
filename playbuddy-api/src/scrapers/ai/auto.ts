import { NormalizedEventInput } from '../../commonTypes.js';
import { ScraperParams } from '../types.js';
import { aiDiscoverAndScrapeFromUrl } from './discovery.js';
import { aiScrapeEventsFromUrl } from './single.js';

/**
 * Decide single vs multi via AI:
 * 1) Try discovery (multi-event); if it returns any events, use them.
 * 2) Otherwise fall back to single-event scrape.
 */
export const aiAutoScrapeUrl = async ({ url, eventDefaults, multipleEvents, extractFromListPage }: ScraperParams): Promise<NormalizedEventInput[]> => {
    const attemptDiscovery = async () => {
        return aiDiscoverAndScrapeFromUrl({ url, eventDefaults, extractFromListPage });
    };

    // If explicitly list-only, rely on discovery and return whatever it yields
    if (extractFromListPage) {
        try {
            return await attemptDiscovery();
        } catch (err) {
            console.error('[ai-auto] discovery (list page) failed', url, err);
            return [];
        }
    }

    try {
        const multi = await attemptDiscovery();
        if (multi && multi.length) return multi;
    } catch (err) {
        console.error('[ai-auto] discovery failed', url, err);
    }

    // If caller expects multiple events, do not fall back to single pages
    if (multipleEvents) return [];

    try {
        const single = await aiScrapeEventsFromUrl({ url, eventDefaults });
        return single || [];
    } catch (err) {
        console.error('[ai-auto] single scrape failed', url, err);
        return [];
    }
};

export default aiAutoScrapeUrl;
