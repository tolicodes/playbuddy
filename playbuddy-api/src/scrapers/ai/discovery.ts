import type { NormalizedEventInput } from '../../commonTypes.js';
import { DiscoverParams, DiscoveredLink } from './types.js';
import { safeParseJsonObject } from './html.js';
import { dbg, saveLogFile } from './debug.js';
import { aiScrapeEventsFromUrl } from './single.js';
import { canonicalUrlKey, classifyPlatform, isFutureEvent, isStartFuture, toISO } from './normalize.js';
import { MODEL, openai } from './config.js';
import { renderAndPick } from './renderPicker.js';
import { prepTruncated } from './prep.js';

export const aiDiscoverAndScrapeFromUrl = async function ({
    url,
    eventDefaults,
    nowISO = new Date().toISOString(),
    maxEvents = 25,
    extractFromListPage = false,
}: DiscoverParams): Promise<NormalizedEventInput[]> {
    const picked = await renderAndPick(url);
    if (!picked) return [];

    const html = picked.chosen.html;

    if (extractFromListPage) {
        console.log('extractFromListPage', url);
        const direct = await extractEventsFromListPage(html, url, eventDefaults, nowISO, maxEvents, picked.chosen.prepped);
        if (direct.length) return direct;
        console.log('continuing')
        // fall through to normal discovery if nothing parsed
    }

    const discovered = await extractEventLinksAIOnly(html, url, nowISO, maxEvents, picked.chosen.prepped);
    dbg('DISCOVERED type', `${discovered?.type} count=${discovered?.items?.length || 0}`);
    if (!discovered || discovered.type === 'single') {
        return await aiScrapeEventsFromUrl({ url, eventDefaults, nowISO });
    }

    const uniq = dedupeByUrl(discovered.items || []).slice(0, Math.max(1, Math.min(500, maxEvents)));
    dbg('DISCOVERED (uniq, capped)', uniq.length);

    const results = await Promise.allSettled(
        uniq.map(link => aiScrapeEventsFromUrl({ url: link.url, eventDefaults, nowISO }))
    );

    const flat: NormalizedEventInput[] =
        results.flatMap(r => r.status === 'fulfilled' ? (r.value || []) : []);
    const final = flat.filter(ev => isFutureEvent(ev, nowISO));

    dbg('FINAL_SCRAPED_EVENTS', final.length);
    return final;
};

export async function extractEventLinksAIOnly(html: string, baseUrl: string, nowISO: string, maxEvents = 25, prepped?: ReturnType<typeof prepTruncated>): Promise<{ type: 'list' | 'single'; items: DiscoveredLink[] }> {
    // Lightly clean and strip obvious boilerplate to focus the prompt
    const { truncatedStripped, baseName } = prepped ?? prepTruncated(html, baseUrl);
    const u = new URL(baseUrl);

    const truncatedFile = await saveLogFile(`html-LIST-truncated-${baseName}`, '.txt', truncatedStripped);
    if (truncatedFile) dbg('Saved truncated HTML for LIST discovery', truncatedFile);

    const prompt = [
        `You are classifying and extracting events from HTML.`,
        `Return ONLY strict JSON: { "type": "list" | "single", "items": [{ "url": string, "start_date": string|null, "source": string|null }] }`,
        `Rules:`,
        `- If this is a single-event page (one event, buy button, long description), set type:"single" and items:[]`,
        `- If this is a list of multiple events, set type:"list" and return up to ${maxEvents} items.`,
        `- URLs must be absolute HTTPS; convert relative using BASE_ORIGIN. Drop mailto/tel/# links.`,
        `- Only include links that look like event detail/ticket pages (eventbrite, partiful, forbiddentickets, joinbloom, tantrany, google form, ticket URLs).`,
        `- Ignore nav/footer/social/login/cart/etc.`,
        `- Only include a url if you see a date/time near a link, store date in ISO in start_date.`,
        `- Exclude obvious past events relative to NOW_ISO.`,
        `- Deduplicate by canonical URL (strip query/fragment).`,
        `BASE_URL: ${baseUrl}`,
        `BASE_ORIGIN: ${u.origin}`,
        `NOW_ISO: ${nowISO}`,
        `CLEAN_HTML (truncated):\n${truncatedStripped}`
    ].join('\n');

    const t0 = Date.now();
    const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
    });
    dbg('DISCOVER ms', Date.now() - t0);

    const raw = resp.choices[0]?.message?.content ?? '';
    const obj = safeParseJsonObject(raw) as any;
    await saveLogFile(`ai-discovery-${baseName}`, '.json', JSON.stringify({ prompt, raw, parsed: obj }, null, 2));
    const type: 'list' | 'single' = obj?.type === 'single' ? 'single' : 'list';
    const items = Array.isArray(obj?.items) ? obj.items : [];

    const normalized: DiscoveredLink[] = [];
    for (const it of items) {
        const href = (it?.url || '').toString().trim();
        if (!href) continue;
        let abs: string;
        try { abs = new URL(href, u).toString(); } catch { continue; }

        const approxISO = toISO(it?.start_date) || null;
        if (approxISO && !isStartFuture(approxISO, nowISO)) continue;

        normalized.push({
            url: abs,
            start_date: approxISO,
            source: (it?.source ?? null) || classifyPlatform(abs) || null,
        });
    }

    return { type, items: normalized };
}

async function extractEventsFromListPage(
    html: string,
    baseUrl: string,
    eventDefaults: Partial<NormalizedEventInput>,
    nowISO: string,
    maxEvents = 25,
    prepped?: ReturnType<typeof prepTruncated>
): Promise<NormalizedEventInput[]> {
    const { truncatedStripped, baseName, jsonBlobs } = prepped ?? prepTruncated(html, baseUrl);
    const u = new URL(baseUrl);
    const prompt = [
        `Extract up to ${maxEvents} events directly from this LIST page (do not follow links).`,
        `Return ONLY strict JSON array: [{"name":string|null,"start_time":string|null,"end_time":string|null,"ticket_url":string|null,"location":string|null,"description_md":string|null,"image_url":string|null,"price":string|null,"organizer_name":string|null,"organizer_url":string|null}]`,
        `Rules:`,
        `- Do NOT invent or guess; leave fields null if not visible.`,
        `- Use ISO-8601 for times when present; if date/time unclear, set null.`,
        `- Prefer ticket/detail URLs found near the event entry; make them absolute with BASE_ORIGIN; drop mailto/tel/#.`,
        `- If multiple dates exist, pick the main/primary date shown.`,
        `BASE_URL: ${baseUrl}`,
        `BASE_ORIGIN: ${u.origin}`,
        `NOW_ISO: ${nowISO}`,
        `HTML (truncated):\n${truncatedStripped}`,
        `JSON/embedded data:\n${(jsonBlobs || []).join('\n\n')}`,
    ].join('\n\n');

    const t0 = Date.now();
    const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
    });
    dbg('LIST_PAGE_EXTRACT ms', Date.now() - t0);

    const raw = resp.choices[0]?.message?.content ?? '';
    await saveLogFile(`ai-discovery-list-${baseName}`, '.json', raw);

    const arr = safeParseJsonObject(raw) as any;

    if (!Array.isArray(arr)) return [];

    const out: NormalizedEventInput[] = [];
    for (const it of arr) {
        const name = it?.name?.toString().trim() || null;
        const startISO = toISO(it?.start_time);
        const endISO = toISO(it?.end_time);
        const ticketUrl = it?.ticket_url ? (() => { try { return new URL(it.ticket_url, u).toString(); } catch { return null; } })() : null;

        if (!name || !startISO) continue;
        if (!isFutureEvent({ start_date: startISO } as any, nowISO)) continue;

        const mapped: NormalizedEventInput = {
            ...(eventDefaults as any),
            organizer: {
                name: it?.organizer_name || it?.organizer || (eventDefaults as any)?.organizer?.name || null,
                url: it?.organizer_url || (eventDefaults as any)?.organizer?.url || null,
            },
            name,
            start_date: startISO,
            end_date: endISO,
            ticket_url: ticketUrl || baseUrl,
            event_url: ticketUrl || baseUrl,
            location: it?.location || null,
            description: it?.description_md || it?.description || null,
            image_url: it?.image_url || null,
            price: it?.price || null,
            source_ticketing_platform: ticketUrl ? classifyPlatform(ticketUrl) : (eventDefaults as any)?.source_ticketing_platform,
            type: 'event',
        };
        out.push(mapped);
    }

    console.log('out', out)

    return out;
}

function dedupeByUrl(items: DiscoveredLink[]): DiscoveredLink[] {
    const seen = new Set<string>();
    const out: DiscoveredLink[] = [];
    for (const it of items) {
        const key = canonicalUrlKey(it.url);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
    }
    return out;
}
