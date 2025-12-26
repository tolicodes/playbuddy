import TurndownService from 'turndown';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import { ScraperParams } from './types.js';
import { EventDataSource, NormalizedEventInput } from '../commonTypes.js';
import { EventTypes } from '../common/types/commonTypes.js';
import { addURLToQueue } from './helpers/getUsingProxy.js';

const turndown = new TurndownService();

export const scrapeEventbriteEvent = async (
    { url, eventDefaults }: ScraperParams
): Promise<NormalizedEventInput[]> => {
    console.log(`[eventbrite] fetching ${url}`);
    const html = await addURLToQueue({
        url,
        json: false,
        label: `Eventbrite Event Page: ${url}`,
    });
    const $ = cheerio.load(html);

    // 1) Extract window.__SERVER_DATA__ JSON
    const serverData = extractServerData($);
    if (!serverData) {
        console.error(`No __SERVER_DATA__ found for: ${url}`);
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

    // 9) Type (retreat vs event) based on title/description
    const type: EventTypes = /retreat|immersion/i.test(`${ev.name} ${description}`) ? 'retreat' as EventTypes : 'event' as EventTypes;

    // 10) Non-NY detection (parity with old scraper: flag if region !== 'NY')
    const region = (eventDefaults as any)?.region;
    const non_ny = region ? region !== 'NY' : eventDefaults?.non_ny ?? false;
    const location = eventDefaults?.location || computedLocation;

    // 10) Build output (keep parity with your Forbidden Tickets shape)
    const out: NormalizedEventInput = {
        ...eventDefaults,
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
        source_ticketing_platform: 'Eventbrite' as EventDataSource['source_ticketing_platform'],
        non_ny,
    };

    return [out];
};

/* ----------------------- helpers ----------------------- */

function extractServerData($: cheerio.CheerioAPI): any | null {
    let blob: any = null;
    $('script').each((_, el) => {
        const txt = $(el).html() || '';
        const m = txt.match(/window\.__SERVER_DATA__\s*=\s*(\{[\s\S]*?\});/);
        if (m) {
            try {
                blob = JSON.parse(m[1]);
                return false; // break
            } catch (e) {
                // keep searching; sometimes multiple scripts present
            }
        }
        return;
    });
    return blob;
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
