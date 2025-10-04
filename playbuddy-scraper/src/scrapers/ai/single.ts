// src/scrapers/ai/single.ts
import type { NormalizedEventInput } from '../../commonTypes.js';
import { ScraperParams } from './types.js';
import { fetchRenderedHtml } from './oxylabs.js';
import { cleanHtml, safeParseJsonObject } from './html.js';
import { dbg, DEBUG_SAVE_HTML, saveLogFile, stableNameFrom } from './debug.js';
import { classifyPlatform, deriveOrganizerOriginalId, deriveOriginalId, isFutureEvent, isRetreatByDuration, toISO } from './normalize.js';
import { MODEL, openai, turndown } from './config.js';

export const aiScrapeEventsFromUrl = async function ({
    url,
    eventDefaults,
    nowISO = new Date().toISOString(),
}: ScraperParams): Promise<NormalizedEventInput[]> {
    const html = await fetchRenderedHtml(url);
    if (!html) return [];

    if (DEBUG_SAVE_HTML) {
        const base = stableNameFrom(url, html);
        const file = await saveLogFile(`html-${base}`, '.html', html);
        if (file) dbg('Saved HTML', file);
    }

    const ev = await extractEventAIOnly(html, url, eventDefaults);
    if (!ev?.name || !ev?.start_date) return [];
    if (!isFutureEvent(ev, nowISO)) return [];
    return [ev];
};

export async function extractEventAIOnly(
    html: string,
    url: string,
    eventDefaults: Partial<NormalizedEventInput>
): Promise<NormalizedEventInput | null> {
    const cleaned = cleanHtml(html);
    const platform = classifyPlatform(url);

    const prompt = [
        `Extract exactly ONE event from the HTML below (this is a single event page, not a list).`,
        `Use context clues to infer dates and normalize to ISO.`,
        `If the page describes multiple events or it's ambiguous, return all fields null or empty arrays.`,
        `For "description_md":`,
        `- Turn into markdown including images`,
        `Return ONLY strict JSON with ALL keys (null or [] if unknown):`,
        `  source_url, name, start_time (ISO), end_time (ISO),`,
        `  organizer: { name, url }, ticket_url, image_url, event_url,`,
        `  location, price, tags (array), description_md, short_summary.`,
        `SOURCE_URL: ${url}`,
        `CLEAN_HTML (truncated):\n${cleaned.slice(0, 120_000)}`
    ].join('\n');

    const t0 = Date.now();
    const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
    });
    dbg('EXTRACT ms', Date.now() - t0);

    const raw = resp.choices[0]?.message?.content ?? '';
    const core = safeParseJsonObject(raw) as any;
    if (!core) return null;

    const originalId = deriveOriginalId(url, platform);
    const startISO = toISO(core?.start_time);
    const endISO = toISO(core?.end_time);

    const descriptionMarkdown = core?.description_md ?? '';

    const orgName = core?.organizer?.name ?? null;
    const orgUrl = core?.organizer?.url ?? null;
    const orgOriginalId = deriveOrganizerOriginalId(orgUrl, platform);

    const base: NormalizedEventInput = {
        ...(eventDefaults as any),
        recurring: 'none',
        original_id: originalId,
        organizer: { name: orgName, url: orgUrl, original_id: orgOriginalId },
        name: core?.name ?? null,
        start_date: startISO,
        end_date: endISO,
        ticket_url: core?.ticket_url ?? url,
        image_url: core?.image_url ?? null,
        event_url: core?.event_url ?? url,
        description: descriptionMarkdown || null,
        short_description: (core?.short_summary || '').toString().trim() || null,
        location: core?.location ?? null,
        price: core?.price ?? null,
        tags: Array.isArray(core?.tags) ? core.tags.filter(Boolean) : [],
        source_ticketing_platform: platform,
        communities: eventDefaults.communities || [],
        non_ny: false,
        type: isRetreatByDuration(startISO, endISO) ? 'retreat' : 'event',
    };

    return base;
}
