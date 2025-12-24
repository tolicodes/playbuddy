import { DEBUG_SAVE_HTML, dbg, saveLogFile, stableNameFrom } from './debug.js';
import { fetchRenderedHtmlBoth, RenderProvider, RenderResult } from './oxylabs.js';
import { chooseProviderLLM } from './providerChoice.js';
import { prepTruncated } from './prep.js';

export type PreparedCandidate = {
    provider: RenderProvider;
    html: string;
    prepped: ReturnType<typeof prepTruncated>;
};

export type RenderPick = {
    chosen: PreparedCandidate;
    candidates: PreparedCandidate[];
    renders: RenderResult[];
};

/**
 * Render with both providers, ask the LLM to pick the better one, and return the chosen HTML
 * along with all candidates and raw render metadata. Length is not used for selection.
 */
export async function renderAndPick(url: string): Promise<RenderPick | null> {
    const renders = await fetchRenderedHtmlBoth(url);

    const candidates: PreparedCandidate[] = renders
        .filter(r => r.ok && r.html)
        .map(r => ({
            provider: r.provider,
            html: r.html!,
            prepped: prepTruncated(r.html!, url),
        }));

    if (candidates.length === 0) return null;

    let picked: RenderProvider = candidates[0]?.provider;
    if (candidates.length > 1) {
        const llmPick = await chooseProviderLLM(
            candidates.map(c => ({
                provider: c.provider,
                truncated: c.prepped.truncatedStripped,
                jsonBlobs: c.prepped.jsonBlobs,
            })),
            url
        );
        if (llmPick && (candidates as any).some((c: PreparedCandidate) => c.provider === llmPick)) {
            picked = llmPick as RenderProvider;
        }
    }

    const chosen = candidates.find(c => c.provider === picked) || candidates[0];

    if (DEBUG_SAVE_HTML) {
        for (const c of candidates) {
            const base = stableNameFrom(`${c.provider}-${url}`, c.html);
            const file = await saveLogFile(`html-${c.provider}-${base}`, '.html', c.html);
            if (file) dbg(`Saved HTML (${c.provider})`, file);
            const truncFile = await saveLogFile(`html-LIST-truncated-${c.provider}-${base}`, '.txt', c.prepped.truncatedStripped);
            if (truncFile) dbg(`Saved truncated HTML (${c.provider})`, truncFile);
        }
    }

    dbg('render pick', { provider: chosen.provider });

    return { chosen, candidates, renders };
}
