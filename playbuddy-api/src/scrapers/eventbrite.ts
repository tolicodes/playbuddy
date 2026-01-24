import TurndownService from 'turndown';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import { ScraperParams, type ScrapeSkipReason } from './types.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { EventTypes } from '../common/types/commonTypes.js';
import { addURLToQueue } from './helpers/getUsingProxy.js';
import { resolveSourceFields } from './helpers/sourceTracking.js';
import { fetchRenderedHtmlBoth } from './ai/oxylabs.js';

const turndown = new TurndownService();

export const scrapeEventbriteEvent = async (
    { url, eventDefaults, onSkip }: ScraperParams
): Promise<NormalizedEventInput[]> => {
    const emitSkip = (reason: string, detail?: string) => {
        const payload: ScrapeSkipReason = {
            url,
            reason,
            ...(detail ? { detail } : {}),
            source: 'eventbrite',
        };
        onSkip?.(payload);
    };
    console.log(`[eventbrite] fetching ${url}`);
    let html: string | null = null;
    let usedRenderFallback = false;
    try {
        html = await addURLToQueue({
            url,
            json: false,
            label: `Eventbrite Event Page: ${url}`,
        });
    } catch (err: any) {
        console.warn(`[eventbrite] primary fetch failed, trying oxylabs/scrapeio for ${url}`, err?.message || err);
        html = await fetchHtmlWithRenderFallback(url);
        usedRenderFallback = true;
    }

    if (!html) {
        console.error(`Empty HTML for Eventbrite page: ${url}`);
        emitSkip('Eventbrite HTML fetch returned empty response');
        return [];
    }

    let $ = cheerio.load(html);

    // 1) Extract window.__SERVER_DATA__ JSON
    let serverData = extractServerData($);
    if (!serverData) {
        if (!usedRenderFallback) {
            const fallbackHtml = await fetchHtmlWithRenderFallback(url);
            if (fallbackHtml) {
                usedRenderFallback = true;
                html = fallbackHtml;
                $ = cheerio.load(fallbackHtml);
                serverData = extractServerData($);
            }
        }
    }
    if (!serverData) {
        let apiDetail: string | undefined;
        const apiFallback = await fetchEventbriteEventFromApi(url, eventDefaults)
            .catch((err: any) => {
                apiDetail = err?.message || String(err);
                return null;
            });
        if (apiFallback) return [apiFallback];

        const jsonLdEvent = extractJsonLdEvent($);
        if (jsonLdEvent) {
            console.warn(`[eventbrite] __SERVER_DATA__ missing, using JSON-LD fallback for ${url}`);
            const fallback = buildEventFromJsonLd(jsonLdEvent, { url, eventDefaults });
            if (fallback) return [fallback];
            const detail = apiDetail
                ? `API fallback failed: ${apiDetail}; JSON-LD found but missing required fields`
                : 'API fallback unavailable; JSON-LD found but missing required fields';
            emitSkip('Missing __SERVER_DATA__ on Eventbrite page', detail);
            return [];
        }
        console.error(`No __SERVER_DATA__ found for: ${url}`);
        const detail = apiDetail ? `API fallback failed: ${apiDetail}` : 'API fallback unavailable and JSON-LD not found';
        emitSkip('Missing __SERVER_DATA__ on Eventbrite page', detail);
        return [];
    }

    const ev = serverData.event ?? {};
    const org = serverData.organizer ?? {};
    const comps = serverData.components ?? {};
    const listing = serverData.event_listing_response ?? {};

    // 2) Core fields
    const original_id = ev.id ? `eventbrite-${ev.id}` : undefined;

    const name: string | undefined = ev.name || undefined;

    // Dates: prefer Eventbrite's UTC ISO strings (already UTC Z)
    const startUTC = ev.start?.utc ?? null;
    const endUTC = ev.end?.utc ?? null;

    // If, for some reason, UTC missing, synthesize from local + tz
    const start_date = normalizeDate(ev.start) ?? startUTC;
    const end_date = normalizeDate(ev.end) ?? endUTC;

    if (!start_date || !end_date) {
        console.error(`Missing start/end datetime for: ${url}`);
        emitSkip('Missing start/end datetime');
        return [];
    }

    // 3) Organizer
    const organizer = {
        name: (org.name || org.displayOrganizationName || '').trim() || undefined,
        url: org.url || undefined,
    };

    // 4) Description (Markdown from structured content HTML)
    const longHtml =
        listing?.structuredContent?.modules?.[0]?.text ??
        comps?.eventDescription?.structuredContent?.modules?.[0]?.text ??
        '';

    const description = longHtml ? turndown.turndown(longHtml) : '';

    // 5) Image
    const image_url =
        serverData?.eventHero?.items?.[0]?.croppedLogoUrl600 ||
        listing?.structuredContent?.heroCarouselWidget?.data?.slides?.[0]?.image?.url ||
        listing?.schemaInfo?.schemaImageUrl ||
        undefined;

    // 6) Location (human-friendly)
    const computedLocation =
        comps?.eventDetails?.location?.venueName ||
        deriveLocationFromBody(longHtml) ||                         // e.g., "Bushwick, Brooklyn (TBA)"
        'To be announced';

    // 7) Tags (category/subcategory ≈ tags)
    const tags = [ev.category, ev.subcategory].filter(Boolean) as string[];

    // 8) Price (choose the minimum *all-in* ticket total if available; fallback to availability minimum)
    const price = deriveMinimumPrice(listing);

    // 9) Type defaults to event; AI classifier assigns play_party/munch/retreat/etc later
    const type: EventTypes = 'event';

    // 10) Non-NY detection (parity with old scraper: flag if region !== 'NY')
    const region = (eventDefaults as any)?.region;
    const non_ny = region ? region !== 'NY' : eventDefaults?.non_ny ?? false;
    const location = eventDefaults?.location || computedLocation;

    const sourceFields = resolveSourceFields({
        eventDefaults,
        sourceUrl: url,
        ticketingPlatform: 'Eventbrite',
    });

    // 10) Build output (keep parity with your Forbidden Tickets shape)
    const out: NormalizedEventInput = {
        ...eventDefaults,
        ...sourceFields,
        original_id,
        ticket_url: ev.url || url,
        name: name!,
        type,
        start_date,
        end_date,
        organizer,
        description,
        image_url,
        price,
        location,
        tags,
        non_ny,
    };

    return [out];
};

/* ----------------------- helpers ----------------------- */

async function fetchHtmlWithRenderFallback(url: string): Promise<string | null> {
    const renders = await fetchRenderedHtmlBoth(url);
    const pick = renders.find(r => r.ok && r.html) || renders.find(r => r.html) || null;
    return pick?.html ?? null;
}

async function fetchEventbriteEventFromApi(
    url: string,
    eventDefaults: Partial<NormalizedEventInput>
): Promise<NormalizedEventInput | null> {
    const eventId = extractEventbriteEventId(url);
    if (!eventId) return null;
    const apiUrl = `https://www.eventbrite.com/api/v3/events/${eventId}/?expand=ticket_availability,organizer,venue,category,subcategory,format`;
    const data = await addURLToQueue({
        url: apiUrl,
        json: true,
        label: `Eventbrite API Event: ${eventId}`,
    });
    if (!data?.id) return null;

    const startUTC = data?.start?.utc ?? null;
    const endUTC = data?.end?.utc ?? null;
    const start_date = normalizeDate(data?.start) ?? startUTC;
    const end_date = normalizeDate(data?.end) ?? endUTC;
    if (!start_date || !end_date) return null;

    const organizer = {
        ...(eventDefaults?.organizer || {}),
        ...(data?.organizer ? {
            name: (data.organizer.name || '').trim() || undefined,
            url: data.organizer.url || undefined,
        } : {}),
    };

    const descriptionHtml = data?.description?.html || '';
    const descriptionText = data?.description?.text || '';
    const description = descriptionHtml
        ? turndown.turndown(descriptionHtml)
        : (descriptionText || '');

    const image_url =
        data?.logo?.original?.url ||
        data?.logo?.url ||
        undefined;

    const venueAddress = data?.venue?.address;
    const location =
        venueAddress?.localized_address_display ||
        venueAddress?.localized_multi_line_address_display?.join(' ') ||
        eventDefaults?.location ||
        'To be announced';

    const region =
        venueAddress?.region ||
        venueAddress?.addressRegion ||
        undefined;
    const non_ny = region ? region !== 'NY' : eventDefaults?.non_ny ?? false;

    const tags = [data?.category?.name, data?.subcategory?.name].filter(Boolean) as string[];

    const price = deriveMinimumPriceFromApi(data?.ticket_availability);

    const sourceFields = resolveSourceFields({
        eventDefaults,
        sourceUrl: url,
        ticketingPlatform: 'Eventbrite',
    });

    return {
        ...eventDefaults,
        ...sourceFields,
        original_id: `eventbrite-${data.id}`,
        ticket_url: data.url || url,
        name: data?.name?.text || data?.name || 'Event',
        type: 'event',
        start_date,
        end_date,
        organizer,
        description,
        image_url,
        price,
        location,
        tags: tags.length ? tags : ((eventDefaults as any)?.tags ?? []),
        non_ny,
    };
}

function extractJsonLdEvent($: cheerio.CheerioAPI): any | null {
    const scripts = $('script[type="application/ld+json"]');
    let found: any = null;
    scripts.each((_, el): boolean | void => {
        const txt = $(el).html();
        if (!txt) return;
        try {
            const data = JSON.parse(txt);
            const candidates: any[] = [];
            if (Array.isArray(data)) {
                candidates.push(...data);
            } else if (data && typeof data === 'object') {
                if (Array.isArray((data as any)['@graph'])) {
                    candidates.push(...(data as any)['@graph']);
                } else {
                    candidates.push(data);
                }
            }
            const match = candidates.find(node => {
                const type = (node as any)?.['@type'];
                if (Array.isArray(type)) return type.includes('Event');
                return type === 'Event';
            });
            if (match) {
                found = match;
                return false;
            }
        } catch {
            return;
        }
        return;
    });
    return found;
}

function buildEventFromJsonLd(
    event: any,
    { url, eventDefaults }: { url: string; eventDefaults: Partial<NormalizedEventInput> }
): NormalizedEventInput | null {
    const name = event?.name || undefined;
    if (!name) return null;

    const startRaw = event?.startDate;
    const endRaw = event?.endDate;
    const start_date = normalizeJsonLdDate(startRaw);
    const end_date = normalizeJsonLdDate(endRaw) || start_date;
    if (!start_date || !end_date) return null;

    const organizerRaw = Array.isArray(event?.organizer) ? event.organizer[0] : event?.organizer;
    const organizer = {
        ...(eventDefaults?.organizer || {}),
        ...(organizerRaw ? {
            name: organizerRaw?.name?.trim() || undefined,
            url: organizerRaw?.url || undefined,
        } : {}),
    };

    const description = typeof event?.description === 'string' ? event.description : '';

    const image = Array.isArray(event?.image) ? event.image[0] : event?.image;
    const image_url = typeof image === 'string' ? image : undefined;

    const location = formatJsonLdLocation(event?.location) || eventDefaults?.location || 'To be announced';

    const price = deriveMinimumPriceFromJsonLd(event?.offers);

    const eventIdMatch = url.match(/tickets-(\d+)/i) || url.match(/-(\d+)(?:[/?#]|$)/);
    const eventId = eventIdMatch?.[1];
    const original_id = eventId ? `eventbrite-${eventId}` : undefined;

    const region = (eventDefaults as any)?.region;
    const non_ny = region ? region !== 'NY' : eventDefaults?.non_ny ?? false;

    const sourceFields = resolveSourceFields({
        eventDefaults,
        sourceUrl: url,
        ticketingPlatform: 'Eventbrite',
    });

    return {
        ...eventDefaults,
        ...sourceFields,
        original_id,
        ticket_url: event?.url || url,
        name,
        type: 'event',
        start_date,
        end_date,
        organizer,
        description,
        image_url,
        price,
        location,
        tags: (eventDefaults as any)?.tags ?? [],
        non_ny,
    };
}

function extractServerData($: cheerio.CheerioAPI): any | null {
    let blob: any = null;
    $('script').each((_, el): boolean | void => {
        const txt = $(el).html() || '';
        if (!txt.includes('__SERVER_DATA__')) return;
        const dataIndex = txt.indexOf('__SERVER_DATA__');
        if (dataIndex === -1) return;
        const assignIndex = txt.indexOf('=', dataIndex);
        if (assignIndex === -1) return;
        const braceStart = txt.indexOf('{', assignIndex);
        if (braceStart === -1) return;
        const jsonBlob = extractJsonObject(txt, braceStart);
        if (!jsonBlob) return;
        try {
            blob = JSON.parse(jsonBlob);
            return false; // break
        } catch {
            // keep searching; sometimes multiple scripts present
        }
        return;
    });
    return blob;
}

function extractJsonObject(text: string, startIndex: number): string | null {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = startIndex; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') {
            depth += 1;
        } else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return text.slice(startIndex, i + 1);
            }
        }
    }
    return null;
}

function normalizeDate(dt: { utc?: string; local?: string; timezone?: string } | undefined | null): string | null {
    if (!dt) return null;
    if (dt.utc) return dt.utc; // already ISO UTC from EB
    if (dt.local && dt.timezone) {
        const iso = DateTime.fromISO(dt.local, { zone: dt.timezone });
        return iso.isValid ? iso.toUTC().toISO() : null;
    }
    return null;
}

function normalizeJsonLdDate(raw?: string | null): string | null {
    if (!raw) return null;
    const iso = DateTime.fromISO(String(raw));
    return iso.isValid ? iso.toUTC().toISO() : null;
}

function deriveMinimumPrice(listing: any): string | undefined {
    // Prefer ticketClasses totalCost.value (cents); otherwise availability.minimumTicketPrice.value
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
        // Return plain number string to match your previous scraper’s "String(price)" pattern
        return String((cents / 100).toFixed(2));
    }

    // Last resort: display strings like "From $71.21"
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

function deriveMinimumPriceFromJsonLd(offers: any): string | undefined {
    if (!offers) return undefined;
    const list = Array.isArray(offers) ? offers : [offers];
    const prices = list
        .map((offer: any) => Number(offer?.price))
        .filter((value: number) => Number.isFinite(value) && value >= 0);
    if (!prices.length) return undefined;
    const min = Math.min(...prices);
    return String(min.toFixed(2));
}

function deriveMinimumPriceFromApi(ticketAvailability: any): string | undefined {
    const cents = Number(ticketAvailability?.minimum_ticket_price?.value);
    if (Number.isFinite(cents) && cents > 0) {
        return String((cents / 100).toFixed(2));
    }
    const display = ticketAvailability?.minimum_ticket_price?.display;
    if (display) {
        const num = parseFloat(String(display).replace(/[^\d.]/g, ''));
        if (!isNaN(num)) return String(num.toFixed(2));
    }
    return undefined;
}

function extractEventbriteEventId(url: string): string | null {
    const match = url.match(/tickets-(\d+)/i) || url.match(/-(\d+)(?:[/?#]|$)/);
    return match?.[1] || null;
}

function formatJsonLdLocation(location: any): string | undefined {
    if (!location) return undefined;
    if (typeof location === 'string') return location;
    const name = location?.name;
    const address = location?.address;
    if (typeof address === 'string') {
        if (name) return `${name} · ${address}`;
        return address;
    }
    const parts = [
        address?.streetAddress,
        address?.addressLocality,
        address?.addressRegion,
        address?.postalCode,
        address?.addressCountry,
    ].filter(Boolean);
    if (name && parts.length) return `${name} · ${parts.join(', ')}`;
    if (name) return name;
    if (parts.length) return parts.join(', ');
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

    // Very light heuristics; tweak if you want richer extraction
    if (/Bushwick/i.test(text)) return 'Bushwick, Brooklyn (TBA)';
    if (/\bBrooklyn\b/i.test(text)) return 'Brooklyn, NY (TBA)';
    if (/\bNew York\b|\bNYC\b/i.test(text)) return 'New York, NY (TBA)';
    return undefined;
}
