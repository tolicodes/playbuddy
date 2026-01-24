import { ScraperParams, type ScrapeSkipReason } from './types.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { addURLToQueue } from './helpers/getUsingProxy.js';
import { scrapeEventbriteEvent } from './eventbrite.js';

type EventbriteEvent = {
    id: string;
    url: string;
    is_series_parent?: boolean;
    venue?: {
        address?: {
            region?: string;
            addressRegion?: string;
            localized_address_display?: string;
            localized_multi_line_address_display?: string[];
        };
    };
};

const getRegion = (ev: EventbriteEvent) =>
    ev?.venue?.address?.region || ev?.venue?.address?.addressRegion || null;

type OrganizerScrapeParams = {
    url: string;
    eventDefaults: Partial<NormalizedEventInput>;
    onSkip?: (skip: ScrapeSkipReason) => void;
};

const scrapeOrganizerPage = async ({
    url,
    eventDefaults,
    onSkip,
}: OrganizerScrapeParams): Promise<NormalizedEventInput[]> => {
    const allEvents: NormalizedEventInput[] = [];
    const organizerDefaults = {
        ...eventDefaults,
        source_url: eventDefaults?.source_url || url,
    };

    try {
        const organizerId = url.split('/').pop()?.split('-').pop();
        if (!organizerId) {
            console.error(`SCRAPE ORGANIZER: Could not extract organizer ID from URL: ${url}`);
            return [];
        }
        console.log(`[eventbrite-organizer] start url=${url} organizerId=${organizerId}`);

        for (let page = 1; page <= 3; page++) {
            const apiUrl = `https://www.eventbrite.com/api/v3/organizers/${organizerId}/events/?expand=ticket_availability,organizer,venue&status=live&only_public=true&page=${page}`;

            const response = await addURLToQueue({
                url: apiUrl,
                json: true,
                label: `Get Eventbrite Organizer page ${page}: ${apiUrl}`,
            });

            if (!response?.events?.length) {
                console.error(`SCRAPE ORGANIZER: No events found for organizer ${url} on page ${page}`);
                // Only abort completely if the very first page is empty; otherwise stop paging and keep what we already have.
                if (page === 1) return [];
                break;
            }

            const rawEvents = response.events as EventbriteEvent[];
            const seriesParents = rawEvents.filter(ev => ev.is_series_parent);
            seriesParents.forEach(ev => {
                onSkip?.({
                    url: ev.url || url,
                    reason: 'Series parent listing (not a specific event)',
                    detail: ev.id ? `event_id=${ev.id}` : undefined,
                    source: 'eventbrite',
                });
            });

            const missingUrl = rawEvents.filter(ev => !ev.is_series_parent && !ev.url);
            missingUrl.forEach(ev => {
                onSkip?.({
                    url,
                    reason: 'Missing event URL from Eventbrite organizer API',
                    detail: ev.id ? `event_id=${ev.id}` : undefined,
                    source: 'eventbrite',
                });
            });

            const filteredEvents = rawEvents.filter(ev => !ev.is_series_parent && !!ev.url);
            console.log(`[eventbrite-organizer] page=${page} total=${response.events.length} filtered=${filteredEvents.length}`);

            const detailedEvents = await Promise.allSettled(
                filteredEvents.map(ev =>
                    scrapeEventbriteEvent({
                        url: ev.url,
                        eventDefaults: {
                            ...organizerDefaults,
                            non_ny: (() => {
                                const region = getRegion(ev);
                                const flag = region ? region !== 'NY' : undefined;
                                return flag;
                            })(),
                            region: getRegion(ev) || undefined,
                            location:
                                ev?.venue?.address?.localized_address_display ||
                                ev?.venue?.address?.localized_multi_line_address_display?.join(' ') ||
                                organizerDefaults?.location,
                        },
                        onSkip,
                    })
                )
            );

            detailedEvents.forEach((res, index) => {
                if (res.status === 'fulfilled' && res.value) allEvents.push(...res.value);
                if (res.status === 'rejected') {
                    const ev = filteredEvents[index];
                    onSkip?.({
                        url: ev?.url || url,
                        reason: 'Error scraping Eventbrite event',
                        detail: res.reason?.message || String(res.reason),
                        source: 'eventbrite',
                    });
                    console.error(`Error scraping Eventbrite event from organizer ${url}:`, res.reason);
                }
            });

            if (!response.pagination?.has_more_items) break;
        }
        console.log(`[eventbrite-organizer] finished url=${url} totalEvents=${allEvents.length}`);
    } catch (error) {
        console.error(`Error scraping Eventbrite API`, error);
    }

    return allEvents;
};

export const scrapeEventbriteOrganizers = async ({
    organizerURLs,
    eventDefaults,
    onSkip,
}: {
    organizerURLs: string[];
    eventDefaults: Partial<NormalizedEventInput>;
    onSkip?: (skip: ScrapeSkipReason) => void;
}): Promise<NormalizedEventInput[]> => {
    const results = await Promise.allSettled(
        organizerURLs.map(url => scrapeOrganizerPage({ url, eventDefaults, onSkip }))
    );

    return results
        .filter((r): r is PromiseFulfilledResult<NormalizedEventInput[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
};

export default scrapeEventbriteOrganizers;
