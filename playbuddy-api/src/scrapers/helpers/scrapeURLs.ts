import { NormalizedEventInput } from '../../commonTypes.js';
import { ScraperParams } from '../types.js';
import { scrapeEventbriteEvent } from '../eventbrite.js';
import { scrapeEventbriteOrganizers } from '../eventbriteOrganizers.js';
import { scrapeForbiddenTicketsEvent } from '../forbiddenTickets.js';
import scrapePartifulEvent from '../partiful.js';
import scrapePluraEvents from '../plura.js';
import scrapeOrganizerTantraNY from '../organizers/tantraNY.js';
import aiAutoScrapeUrl from '../ai/auto.js';
type ScraperEntry = {
    scraper: (params: ScraperParams) => Promise<NormalizedEventInput[] | null>;
    eventRegex: RegExp;
    eventRegexIndex: number;
};

const SCRAPERS: Record<string, ScraperEntry> = {
    'eventbrite.com': {
        scraper: scrapeEventbriteEvent,
        eventRegex: /.*/,
        eventRegexIndex: 0,
    },
    'joinbloom.community': {
        scraper: scrapePluraEvents,
        eventRegex: /.*/,
        eventRegexIndex: 0,
    },
    'tantrany.com': {
        scraper: scrapeOrganizerTantraNY as any,
        eventRegex: /.*/,
        eventRegexIndex: 0,
    },
    'partiful.com': {
        scraper: scrapePartifulEvent,
        eventRegex: /partiful\.com\/e\/([^/?#]+)/,
        eventRegexIndex: 1,
    },
    'forbiddentickets.com': {
        scraper: scrapeForbiddenTicketsEvent,
        eventRegex: /.*/,
        eventRegexIndex: 0,
    },
};

const dedupe = (urls: string[]): string[] => {
    const seen = new Set();
    return urls.filter((url) => {
        const isNew = !seen.has(url);
        seen.add(url);
        return isNew;
    });
};

const getDomainKey = (url: string): string => {
    const { hostname } = new URL(url);
    const parts = hostname.replace(/^www\./, '').split('.');
    return parts.slice(-2).join('.');
};

export const scrapeURLs = async (
    urls: string[],
    eventDefaults: Partial<NormalizedEventInput> = {}
): Promise<NormalizedEventInput[]> => {
    const results: NormalizedEventInput[] = [];
    const uniqueUrls = dedupe(urls);

    for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        console.log(`[${i + 1}/${uniqueUrls.length}] ${url}`);

        const domain = getDomainKey(url);

        // Handle Eventbrite organizer pages directly (fetch multiple events)
        if (domain === 'eventbrite.com' && /eventbrite\.com\/o\//i.test(url)) {
            try {
                const organizerEvents = await scrapeEventbriteOrganizers({
                    organizerURLs: [url],
                    eventDefaults,
                });
                results.push(...organizerEvents);
            } catch (err) {
                console.error(`Error scraping Eventbrite organizer ${url}:`, err);
            }
            continue;
        }

        const config = SCRAPERS[domain];

        // If no explicit scraper, let AI decide multi vs single
        if (!config) {
            const aiEvents = await aiAutoScrapeUrl({ url, eventDefaults });
            if (aiEvents?.length) results.push(...aiEvents);
            continue;
        }

        const match = url.match(config.eventRegex);
        if (!match || !match[config.eventRegexIndex]) {
            console.warn(`Could not extract event ID from: ${url}`);
            continue;
        }

        const eventId = match[config.eventRegexIndex];

        try {
            const scraped = await config.scraper({ url: eventId, eventDefaults });
            if (scraped) results.push(...scraped);
        } catch (err: any) {
            if (err?.message === 'Timeout') {
                console.warn(`Timeout scraping: ${url}`);
            } else {
                console.error(`Error scraping ${url}:`, err);
            }
        }
    }

    return results;
};

export default scrapeURLs;
