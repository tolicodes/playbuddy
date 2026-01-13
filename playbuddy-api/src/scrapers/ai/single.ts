// src/scrapers/ai/single.ts
import type { NormalizedEventInput } from '../../commonTypes.js';
import { ScraperParams } from './types.js';
import { cleanHtml, safeParseJsonObject } from './html.js';
import { dbg, DEBUG_SAVE_HTML, saveLogFile, stableNameFrom } from './debug.js';
import { classifyPlatform, deriveOrganizerOriginalId, deriveOriginalId, isFutureEvent, toISO } from './normalize.js';
import { MODEL, openai } from './config.js';
import { renderAndPick } from './renderPicker.js';

export const aiScrapeEventsFromUrl = async function ({
    url,
    eventDefaults,
    nowISO = new Date().toISOString(),
}: ScraperParams): Promise<NormalizedEventInput[]> {
    const picked = await renderAndPick(url);
    if (!picked) {
        console.log('No valid renderers returned HTML');
        return [];
    }

    // Try chosen first, then fall back to other candidates if extraction fails
    const ordered = [picked.chosen, ...picked.candidates.filter(c => c.provider !== picked.chosen.provider)];

    for (const c of ordered) {
        if (DEBUG_SAVE_HTML) {
            const base = stableNameFrom(`${c.provider}-${url}`, c.html);
            await saveLogFile(`html-${c.provider}-${base}`, '.html', c.html);
        }

        const ev = await extractEventAIOnly(c.html, url, eventDefaults);
        if (ev && ev.name && ev.start_date && isFutureEvent(ev, nowISO)) {
            dbg('EXTRACT pick', {
                provider: c.provider,
                renders: picked.renders.map(r => ({ provider: r.provider, ok: r.ok }))
            });
            return [ev];
        }
    }

    console.log('No valid event extracted from any renderer');
    return [];
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
        `  organizer: { name, url }, ticket_url (make sure you include domain), image_url, event_url,`,
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
    console.log('ML Extract', core);

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
        // short_description: (core?.short_summary || '').toString().trim() || null,
        location: core?.location ?? null,
        price: core?.price ?? null,
        tags: Array.isArray(core?.tags) ? core.tags.filter(Boolean) : [],
        source_ticketing_platform: platform,
        communities: eventDefaults.communities || [],
        non_ny: false,
        type: 'event',
    };

    return base;
}
