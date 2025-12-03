import { ScraperParams } from './types.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { addURLToQueue } from './helpers/getUsingProxy.js';
import { scrapeEventbriteEvent } from './eventbrite.js';

type EventbriteEvent = {
    id: string;
    name: { text: string };
    url: string;
    start: { utc: string; timezone: string; local: string };
    end: { timezone: string; local: string; utc: string };
    organizer: { id: string; name: string; url: string };
    category?: { name: string };
    ticket_availability?: { minimum_ticket_price?: { display?: string } };
    is_series_parent?: boolean;
};

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
                label: `Get Eventbrite Organizer page ${page}: ${apiUrl}`
            });

            if (!response || (!response.events || response.events?.length === 0)) {
                console.error(`SCRAPE ORGANIZER: No events found for organizer ${url}`);
                return [];
            }
            const rawEvents = response.events as EventbriteEvent[];

            const filteredEvents = rawEvents.filter((event: EventbriteEvent) => !event.is_series_parent);
            const detailedEvents = await Promise.allSettled(
                filteredEvents.map(ev =>
                    scrapeEventbriteEvent({
                        url: ev.url,
                        eventDefaults,
                    })
                )
            );
            detailedEvents.forEach(res => {
                if (res.status === 'fulfilled' && res.value) {
                    allEvents.push(...res.value);
                } else if (res.status === 'rejected') {
                    console.error(`Error scraping Eventbrite event from organizer ${url}:`, res.reason);
                }
            });

            if (!response.pagination?.has_more_items) {
                break;
            }
        }
    } catch (error) {
        console.error(`Error scraping Eventbrite API`, error);
    }

    return allEvents;
};

function extractOrganizerSlug(url: string): string {
    const match = url.match(/eventbrite\.com\/o\/(.*)-\d+$/);
    return match ? match[1] : 'unknown';
}

export const scrapeEventbriteOrganizers = async ({
    organizerURLs,
    eventDefaults,
}: {
    organizerURLs: string[];
    eventDefaults: Partial<NormalizedEventInput>;
}): Promise<NormalizedEventInput[]> => {
    console.time(`⏱️ scrapeEventsFromOrganizers (${organizerURLs.length} organizers)`);

    const organizerResults: {
        url: string;
        promise: PromiseSettledResult<NormalizedEventInput[]>;
    }[] = [];

    for (const organizerURL of organizerURLs) {
        try {
            const events = await scrapeOrganizerPage({ url: organizerURL, eventDefaults });
            organizerResults.push({ url: organizerURL, promise: { status: 'fulfilled', value: events } });
        } catch (err) {
            organizerResults.push({ url: organizerURL, promise: { status: 'rejected', reason: err } as PromiseRejectedResult });
        }
    }

    const organizerStats: Record<string, { success: number; failed: number }> = {};
    for (const { url, promise } of organizerResults) {
        const slug = extractOrganizerSlug(url);
        if (!organizerStats[slug]) organizerStats[slug] = { success: 0, failed: 0 };
        if (promise.status === 'fulfilled') organizerStats[slug].success += (promise as PromiseFulfilledResult<NormalizedEventInput[]>).value.length;
        else organizerStats[slug].failed += 1;
    }

    const totalSuccess = Object.values(organizerStats).reduce((s, r) => s + r.success, 0);
    const totalFailed = Object.values(organizerStats).reduce((s, r) => s + r.failed, 0);
    console.log(`✅ total success: ${totalSuccess}`);
    console.log(`❌ total failed:  ${totalFailed}`);
    console.timeEnd(`⏱️ scrapeEventsFromOrganizers (${organizerURLs.length} organizers)`);

    return organizerResults
        .filter(r => r.promise.status === 'fulfilled')
        .flatMap(r => (r.promise as PromiseFulfilledResult<NormalizedEventInput[]>).value);
};

export default scrapeEventbriteOrganizers;
