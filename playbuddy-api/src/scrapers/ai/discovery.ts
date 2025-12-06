import type { NormalizedEventInput } from '../../commonTypes.js';
import { DiscoverParams, DiscoveredLink } from './types.js';
import { fetchRenderedHtml } from './oxylabs.js';
import { cleanHtml, safeParseJsonObject } from './html.js';
import { dbg, DEBUG_SAVE_HTML, saveLogFile, stableNameFrom } from './debug.js';
import { aiScrapeEventsFromUrl } from './single.js';
import { canonicalUrlKey, classifyPlatform, isFutureEvent, isStartFuture, toISO } from './normalize.js';
import { MODEL, openai } from './config.js';

export const aiDiscoverAndScrapeFromUrl = async function ({
    url,
    eventDefaults,
    nowISO = new Date().toISOString(),
    maxEvents = 25,
}: DiscoverParams): Promise<NormalizedEventInput[]> {
    const html = await fetchRenderedHtml(url);
    if (!html) return [];

    if (DEBUG_SAVE_HTML) {
        const base = stableNameFrom(url, html);
        const file = await saveLogFile(`html-LIST-${base}`, '.html', html);
        if (file) dbg('Saved LIST HTML', file);
    }

    const discovered = await extractEventLinksAIOnly(html, url, nowISO, maxEvents);
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

export async function extractEventLinksAIOnly(html: string, baseUrl: string, nowISO: string, maxEvents = 25): Promise<{ type: 'list' | 'single'; items: DiscoveredLink[] }> {
    // Lightly clean and strip obvious boilerplate to focus the prompt
    const cleaned = cleanHtml(html)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '');
    const u = new URL(baseUrl);
    const truncated = cleaned.slice(0, 120000); // keep generous context but trimmed

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
        `CLEAN_HTML (truncated):\n${truncated}`
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
