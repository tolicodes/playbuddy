import { NormalizedEventInput } from '../commonTypes.js';
import { ScraperParams } from '../scrapers/types.js';
import { scrapeForbiddenTicketsEvent } from './forbiddenTickets.js';
import scrapePartifulEvent from './partiful.js';

type ScraperEntry = {
    scraper: (params: ScraperParams) => Promise<NormalizedEventInput[] | null>;
    eventRegex: RegExp;
    eventRegexIndex: number;
};

const SCRAPERS: Record<string, ScraperEntry> = {
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

const timeout = (ms: number): Promise<null> =>
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

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

export const scrapeURLs = async (urls: string[]): Promise<NormalizedEventInput[]> => {
    const results: NormalizedEventInput[] = [];
    const uniqueUrls = dedupe(urls);

    for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        console.log(`[${i + 1}/${uniqueUrls.length}] ${url}`);

        const domain = getDomainKey(url);
        const config = SCRAPERS[domain];

        if (!config) {
            console.warn(`No scraper configured for: ${domain}`);
            continue;
        }

        const match = url.match(config.eventRegex);
        if (!match || !match[config.eventRegexIndex]) {
            console.warn(`Could not extract event ID from: ${url}`);
            continue;
        }

        const eventId = match[config.eventRegexIndex];

        try {
            const scraped = await Promise.race([
                config.scraper({ url: eventId, eventDefaults: {} }),
                timeout(200000),
            ]);
            if (scraped) results.push(...scraped);
        } catch (err: any) {
            if (err?.message === 'Timeout') {
                console.warn(`Timeout scraping: ${url}`);
            } else {
                console.error(`Error scraping ${url}:`, err);
            }
        }
    }

    console.log(`✅ Scraped ${results.length} events`);
    return results;
};

export default scrapeURLs;
