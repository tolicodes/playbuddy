import { NormalizedEventInput } from '../../commonTypes.js';
import PQueue from 'p-queue';
import { ScraperParams, type ScrapeSkipReason } from '../types.js';
import { scrapeEventbriteEvent } from '../eventbrite.js';
import { scrapeEventbriteOrganizers } from '../eventbriteOrganizers.js';
import { scrapeForbiddenTicketsEvent } from '../forbiddenTickets.js';
import scrapePartifulEvent from '../partiful.js';
import scrapePluraEvents from '../plura.js';
import scrapeOrganizerTantraNY from '../organizers/tantraNY.js';
import aiAutoScrapeUrl from '../ai/auto.js';
type UrlInput = string | { url: string; multipleEvents?: boolean; extractFromListPage?: boolean; metadata?: Partial<NormalizedEventInput> };
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

const normalizeInputs = (inputs: UrlInput[]): { url: string; multipleEvents?: boolean; extractFromListPage?: boolean; metadata?: Partial<NormalizedEventInput> }[] => {
    return inputs
        .map((i) => (typeof i === 'string' ? { url: i } : i))
        .filter((i) => !!i.url);
};

const dedupe = (inputs: { url: string; multipleEvents?: boolean; extractFromListPage?: boolean; metadata?: Partial<NormalizedEventInput> }[]) => {
    const seen = new Set<string>();
    const out: typeof inputs = [];
    for (const i of inputs) {
        if (seen.has(i.url)) continue;
        seen.add(i.url);
        out.push(i);
    }
    return out;
};

const getDomainKey = (url: string): string => {
    const { hostname } = new URL(url);
    const parts = hostname.replace(/^www\./, '').split('.');
    return parts.slice(-2).join('.');
};

export const scrapeURLs = async (
    urls: UrlInput[],
    eventDefaults: Partial<NormalizedEventInput> = {},
    options: { onSkip?: (skip: ScrapeSkipReason) => void } = {}
): Promise<NormalizedEventInput[]> => {
    const results: NormalizedEventInput[] = [];
    const urlConcurrency = Number(process.env.SCRAPE_URL_CONCURRENCY || process.env.SCRAPE_MAX_CONCURRENCY || 8);
    const queue = new PQueue({ concurrency: urlConcurrency });
    const onSkip = options.onSkip;
    const uniqueInputs = dedupe(normalizeInputs(urls));
    console.log(`[scrapeURLs] start inputs=${uniqueInputs.length}`);

    await Promise.all(
        uniqueInputs.map((input, index) =>
            queue.add(async () => {
                const { url, multipleEvents, extractFromListPage, metadata } = input;
                const mergedDefaults: Partial<NormalizedEventInput> = {
                    ...eventDefaults,
                    ...(metadata || {}),
                    organizer: {
                        ...(eventDefaults.organizer || {}),
                        ...((metadata as any)?.organizer || {}),
                    },
                };
                const normalizedSourceUrl = typeof mergedDefaults.source_url === 'string' && mergedDefaults.source_url.trim()
                    ? mergedDefaults.source_url.trim()
                    : url;
                const sourceDefaults: Partial<NormalizedEventInput> = {
                    ...mergedDefaults,
                    ...(normalizedSourceUrl ? { source_url: normalizedSourceUrl } : {}),
                };
                console.log(`[scrapeURLs] [${index + 1}/${uniqueInputs.length}] ${url}`);

                const domain = getDomainKey(url);

                // Handle Eventbrite organizer pages directly (fetch multiple events)
                if (domain === 'eventbrite.com' && /eventbrite\.com\/o\//i.test(url)) {
                    try {
                        console.log(`[scrapeURLs] using Eventbrite organizer scraper for ${url}`);
                        const organizerEvents = await scrapeEventbriteOrganizers({
                            organizerURLs: [url],
                            eventDefaults: sourceDefaults,
                            onSkip,
                        });
                        results.push(...organizerEvents);
                        console.log(`[scrapeURLs] organizer events added=${organizerEvents.length}`);
                    } catch (err) {
                        console.error(`Error scraping Eventbrite organizer ${url}:`, err);
                    }
                    return;
                }

                const config = SCRAPERS[domain];

                // If no explicit scraper, let AI decide multi vs single
                if (!config) {
                    console.log(`[scrapeURLs] no explicit scraper for ${domain}, delegating to AI (multipleEvents=${!!multipleEvents}, extractFromListPage=${!!extractFromListPage})`);
                    const aiDefaults: Partial<NormalizedEventInput> = {
                        ...sourceDefaults,
                        source_origination_platform: sourceDefaults.source_origination_platform ?? 'website-ai-discovery',
                    };
                    const aiEvents = await aiAutoScrapeUrl({ url, eventDefaults: aiDefaults, multipleEvents, extractFromListPage });
                    if (aiEvents?.length) results.push(...aiEvents);
                    console.log(`[scrapeURLs] AI results=${aiEvents?.length || 0}`);
                    return;
                }

                const match = url.match(config.eventRegex);
                if (!match || !match[config.eventRegexIndex]) {
                    console.warn(`Could not extract event ID from: ${url}`);
                    return;
                }

                const eventId = match[config.eventRegexIndex];

                try {
                    console.log(`[scrapeURLs] using scraper for ${domain} id=${eventId}`);
                    const scraped = await config.scraper({ url: eventId, eventDefaults: sourceDefaults, onSkip });
                    if (scraped) results.push(...scraped);
                    console.log(`[scrapeURLs] scraped count=${scraped?.length || 0} for ${url}`);
                } catch (err: any) {
                    if (err?.message === 'Timeout') {
                        console.warn(`Timeout scraping: ${url}`);
                    } else {
                        console.error(`Error scraping ${url}:`, err);
                    }
                }
            })
        )
    );

    return results;
};

export default scrapeURLs;
