// src/scrapers/ai/discovery.ts
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

    const discovered = await extractEventLinksAIOnly(html, url, nowISO);
    dbg('DISCOVERED (pre-cap)', discovered?.length || 0);
    console.log('discovered', discovered)
    if (!discovered?.length) return [];

    const uniq = dedupeByUrl(discovered).slice(0, Math.max(1, Math.min(500, maxEvents)));
    dbg('DISCOVERED (uniq, capped)', uniq.length);

    const results = await Promise.allSettled(
        uniq.map(link => aiScrapeEventsFromUrl({ url: link.url, eventDefaults, nowISO }))
    );

    const flat: NormalizedEventInput[] =
        results.flatMap(r => r.status === 'fulfilled' ? (r.value || []) : []);
    const final = flat.filter(ev => isFutureEvent(ev, nowISO));

    console.log('final', final)
    dbg('FINAL_SCRAPED_EVENTS', final.length);
    return final;
};

export async function extractEventLinksAIOnly(html: string, baseUrl: string, nowISO: string): Promise<DiscoveredLink[]> {
    const cleaned = cleanHtml(html);
    const u = new URL(baseUrl);

    const prompt = [
        `Extract ticket URLs from an HTML page that is a list of events.`,
        `Rules:`,
        `- Ignore nav, footer, socials, and non-event links.`,
        `- Treat as a list if the page has multiple blocks with date/time and links to ticket sites or internal event pages.`,
        `- Return only links that look like dedicated event detail pages or direct ticket pages.`,
        `- If you can infer datetime near a link, include it as ISO in "approx_start_time", else null.`,
        `- Add "source_hint" when detectable from URL.`,
        `- Prefer future events relative to NOW_ISO. Exclude items you can tell are in the past.`,
        `Output strict JSON: { "items": Array<{ url: string, approx_start_time: string|null, title: string|null, source_hint: string|null }> }`,
        ``,
        `BASE_URL: ${baseUrl}`,
        `BASE_ORIGIN: ${u.origin}`,
        `NOW_ISO: ${nowISO}`,
        `CLEAN_HTML (truncated):\n${cleaned.slice(0, 120_000)}`
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
    const items = Array.isArray(obj?.items) ? obj.items : [];

    const normalized: DiscoveredLink[] = [];
    for (const it of items) {
        const href = (it?.url || '').toString().trim();
        if (!href) continue;
        let abs: string;
        try { abs = new URL(href, u).toString(); } catch { continue; }

        const approxISO = toISO(it?.approx_start_time) || null;
        if (approxISO && !isStartFuture(approxISO, nowISO)) continue;

        normalized.push({
            url: abs,
            approx_start_time: approxISO,
            title: (it?.title ?? null) || null,
            source_hint: (it?.source_hint ?? null) || classifyPlatform(abs) || null,
        });
    }

    return normalized;
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
