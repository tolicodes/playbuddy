import { ScraperParams } from './types.js';
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

const scrapeOrganizerPage = async ({
    url,
    eventDefaults,
}: ScraperParams): Promise<NormalizedEventInput[]> => {
    const allEvents: NormalizedEventInput[] = [];

    try {
        const organizerId = url.split('/').pop()?.split('-').pop();
        if (!organizerId) {
            console.error(`SCRAPE ORGANIZER: Could not extract organizer ID from URL: ${url}`);
            return [];
        }

        for (let page = 1; page <= 3; page++) {
            const apiUrl = `https://www.eventbrite.com/api/v3/organizers/${organizerId}/events/?expand=ticket_availability,organizer,venue&status=live&only_public=true&page=${page}`;

            const response = await addURLToQueue({
                url: apiUrl,
                json: true,
                label: `Get Eventbrite Organizer page ${page}: ${apiUrl}`,
            });

            if (!response?.events?.length) {
                console.error(`SCRAPE ORGANIZER: No events found for organizer ${url}`);
                return [];
            }

            const filteredEvents = (response.events as EventbriteEvent[]).filter(ev => !ev.is_series_parent);

            const detailedEvents = await Promise.allSettled(
                filteredEvents.map(ev =>
                    scrapeEventbriteEvent({
                        url: ev.url,
                        eventDefaults: {
                            ...eventDefaults,
                            non_ny: (() => {
                                const region = getRegion(ev);
                                const flag = region ? region !== 'NY' : undefined;
                                return flag;
                            })(),
                            region: getRegion(ev) || undefined,
                            location:
                                ev?.venue?.address?.localized_address_display ||
                                ev?.venue?.address?.localized_multi_line_address_display?.join(' ') ||
                                eventDefaults?.location,
                        },
                    })
                )
            );

            detailedEvents.forEach(res => {
                if (res.status === 'fulfilled' && res.value) allEvents.push(...res.value);
                if (res.status === 'rejected') console.error(`Error scraping Eventbrite event from organizer ${url}:`, res.reason);
            });

            if (!response.pagination?.has_more_items) break;
        }
    } catch (error) {
        console.error(`Error scraping Eventbrite API`, error);
    }

    return allEvents;
};

export const scrapeEventbriteOrganizers = async ({
    organizerURLs,
    eventDefaults,
}: {
    organizerURLs: string[];
    eventDefaults: Partial<NormalizedEventInput>;
}): Promise<NormalizedEventInput[]> => {
    const results = await Promise.allSettled(
        organizerURLs.map(url => scrapeOrganizerPage({ url, eventDefaults }))
    );

    return results
        .filter((r): r is PromiseFulfilledResult<NormalizedEventInput[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
};

export default scrapeEventbriteOrganizers;
