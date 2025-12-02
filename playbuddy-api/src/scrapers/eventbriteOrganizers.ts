import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { DateTime } from 'luxon';
import { ScraperParams } from './types.js';
import { EventTypes } from '../common/types/commonTypes.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { addURLToQueue } from './helpers/getUsingProxy.js';

type EventbriteEvent = {
    id: string;
    name: { text: string };
    url: string;
    start: { utc: string; timezone: string; local: string };
    end: { timezone: string; local: string; utc: string };
    logo?: { url?: string };
    organizer: { id: string; name: string; url: string };
    venue?: { address?: { region?: string; localized_address_display?: string } };
    ticket_availability?: { minimum_ticket_price?: { display?: string } };
    category?: { name: string };
    is_series_parent?: boolean;
};

const turndown = new TurndownService();

const filterByRegion = (event: EventbriteEvent, region: string) => {
    return event.venue?.address?.region === region;
};

const isRetreat = (event: EventbriteEvent) => {
    return new Date(event.end.utc).getTime() - new Date(event.start.utc).getTime() > 24 * 60 * 60 * 1000;
};

const mapEventbriteEventToEvent = (eventbriteEvents: EventbriteEvent[], eventDefaults: Partial<NormalizedEventInput>): NormalizedEventInput[] => {
    const nyEvents = eventbriteEvents.filter(event => filterByRegion(event, 'NY'));
    console.log('Organizer', eventbriteEvents[0]?.organizer?.name);
    console.log('FILTER: Total Events: ', eventbriteEvents.length, ' to NY Events:', nyEvents.length);

    return eventbriteEvents.map((event) => {
        const start_date = event.start.utc;
        const end_date = event.end.utc;

        const isRetreatEvent = isRetreat(event);
        const isNonNyEvent = !filterByRegion(event, 'NY');

        return {
            ...eventDefaults,
            recurring: 'none',
            original_id: `eventbrite-${event.id}`,
            organizer: {
                name: event.organizer.name,
                url: event.organizer.url,
                original_id: `eventbrite-${event.organizer.id}`,
            },
            name: event.name.text,
            start_date,
            end_date,
            ticket_url: event.url,
            image_url: event.logo?.url,
            event_url: event.url,
            description: '',
            location: event.venue?.address?.localized_address_display || 'To be announced',
            price: event.ticket_availability?.minimum_ticket_price?.display,
            tags: event.category ? [event.category.name] : [],
            source_ticketing_platform: "Eventbrite",
            communities: eventDefaults.communities || [],
            non_ny: isNonNyEvent,
            type: isRetreatEvent ? 'retreat' : 'event',
        };
    });
};

const fetchFullEventDetails = async (
    event: NormalizedEventInput,
    eventDefaults: Partial<NormalizedEventInput>
): Promise<NormalizedEventInput | null> => {
    const eventUrl = event.event_url || event.ticket_url;
    if (!eventUrl) return null;

    try {
        const html = await addURLToQueue({
            url: eventUrl,
            json: false,
            label: `Get Eventbrite Event Page: ${eventUrl}`,
        });
        const $ = cheerio.load(html);
        const serverData = extractServerData($ as any);

        if (!serverData) {
            console.error(`SCRAPE ORGANIZER: No __SERVER_DATA__ found for: ${eventUrl}`);
            return null;
        }

        const ev = serverData.event ?? {};
        const org = serverData.organizer ?? {};
        const comps = serverData.components ?? {};
        const listing = serverData.event_listing_response ?? {};

        const original_id = ev.id ? `eventbrite-${ev.id}` : event.original_id;
        const name: string | undefined = ev.name || event.name;

        const startUTC = ev.start?.utc ?? null;
        const endUTC = ev.end?.utc ?? null;

        const start_date = normalizeDate(ev.start) ?? startUTC ?? event.start_date;
        const end_date = normalizeDate(ev.end) ?? endUTC ?? event.end_date;

        if (!start_date || !end_date) {
            console.error(`SCRAPE ORGANIZER: Missing start/end datetime for: ${eventUrl}`);
            return null;
        }

        const longHtml =
            listing?.structuredContent?.modules?.[0]?.text ??
            comps?.eventDescription?.structuredContent?.modules?.[0]?.text ??
            '';

        const description = longHtml ? turndown.turndown(longHtml) : '';

        const image_url =
            serverData?.eventHero?.items?.[0]?.croppedLogoUrl600 ||
            listing?.structuredContent?.heroCarouselWidget?.data?.slides?.[0]?.image?.url ||
            listing?.schemaInfo?.schemaImageUrl ||
            event.image_url;

        const location =
            comps?.eventDetails?.location?.venueName ||
            deriveLocationFromBody(longHtml) ||
            event.location ||
            'To be announced';

        const candidateTags = [ev.category, ev.subcategory].filter(Boolean) as string[];
        const tags = candidateTags.length ? candidateTags : (event.tags || []);

        const price = deriveMinimumPrice(listing) ?? event.price;

        const typeFromContent: EventTypes = /retreat|immersion/i.test(`${ev.name} ${description}`) ? 'retreat' : 'event';
        const type: EventTypes = event.type ?? typeFromContent;

        const organizerName = (org.name || org.displayOrganizationName || '').trim();
        const organizer = organizerName
            ? {
                name: organizerName,
                url: org.url || event.organizer?.url,
                original_id: org.id ? `eventbrite-${org.id}` : event.organizer?.original_id,
            }
            : event.organizer;

        return {
            ...eventDefaults,
            ...event,
            original_id: original_id ?? event.original_id,
            ticket_url: ev.url || event.ticket_url || eventUrl,
            event_url: ev.url || eventUrl,
            name: name || event.name,
            type,
            start_date,
            end_date,
            organizer: organizer || event.organizer,
            description,
            image_url,
            price: price ?? undefined,
            location,
            tags,
            source_ticketing_platform: 'Eventbrite',
            recurring: 'none',
            non_ny: event.non_ny,
        };
    } catch (error) {
        console.error(`SCRAPE ORGANIZER: Error scraping event page ${eventUrl}:`, error);
        return null;
    }
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
            const rawEvents = response.events;

            const filteredEvents = rawEvents.filter((event: EventbriteEvent) => !event.is_series_parent);
            const events = mapEventbriteEventToEvent(filteredEvents, eventDefaults);

            const detailedEvents = await Promise.all(events.map((event) => fetchFullEventDetails(event, eventDefaults)));
            const successfulEvents = detailedEvents.filter((event): event is NormalizedEventInput => Boolean(event));

            allEvents.push(...successfulEvents);

            if (!response.pagination?.has_more_items) {
                break;
            }
        }
    } catch (error) {
        console.error(`Error scraping Eventbrite API`, error);
    }

    return allEvents;
};

const extractServerData = ($: cheerio.CheerioAPI): any | null => {
    let blob: any = null;
    $('script').each((_, el) => {
        if (blob) return false;
        const txt = $(el).html() || '';
        const m = txt.match(/window\.__SERVER_DATA__\s*=\s*(\{[\s\S]*?\});/);
        if (m) {
            try {
                blob = JSON.parse(m[1]);
            } catch {
                blob = null;
            }
            return false;
        }
        return;
    });
    return blob;
};

function normalizeDate(dt: { utc?: string; local?: string; timezone?: string } | undefined | null): string | null {
    if (!dt) return null;
    if (dt.utc) return dt.utc;
    if (dt.local && dt.timezone) {
        const iso = DateTime.fromISO(dt.local, { zone: dt.timezone });
        return iso.isValid ? iso.toUTC().toISO() : null;
    }
    return null;
}

function deriveMinimumPrice(listing: any): string | undefined {
    const classes: any[] = listing?.tickets?.ticketClasses || [];
    const totals = classes
        .map(tc => Number(tc?.totalCost?.value))
        .filter(v => Number.isFinite(v) && v > 0);

    let cents: number | undefined;
    if (totals.length) {
        cents = Math.min(...totals);
    } else {
        const v = Number(listing?.tickets?.availability?.minimumTicketPrice?.value);
        if (Number.isFinite(v) && v > 0) cents = v;
    }

    if (typeof cents === 'number') {
        return String((cents / 100).toFixed(2));
    }

    const display =
        listing?.tickets?.availability?.minimumTicketPrice?.display ||
        listing?.components?.conversionBar?.panelDisplayPrice ||
        undefined;

    if (display) {
        const num = parseFloat(String(display).replace(/[^\d.]/g, ''));
        if (!isNaN(num)) return String(num.toFixed(2));
    }

    return undefined;
}

function deriveLocationFromBody(html: string | undefined | null): string | undefined {
    if (!html) return undefined;
    const text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (/Bushwick/i.test(text)) return 'Bushwick, Brooklyn (TBA)';
    if (/\bBrooklyn\b/i.test(text)) return 'Brooklyn, NY (TBA)';
    if (/\bNew York\b|\bNYC\b/i.test(text)) return 'New York, NY (TBA)';
    return undefined;
}

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
