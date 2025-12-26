// src/scrapers/ai/fetchers.ts
import fetch from 'node-fetch';
import { OXY_REALTIME_URL, OXY_USERNAME, OXY_PASSWORD } from './config.js';
import { getUsingProxy } from '../helpers/getUsingProxy.js';

function basicAuthHeader(user: string, pass: string) {
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

type OxylabsResult = {
    results?: Array<{ content?: string; status_code?: number }>;
};

export type RenderProvider = 'oxylabs' | 'scrapeio';
export type RenderResult = { provider: RenderProvider; ok: boolean; html: string | null; ms: number; error?: string };

async function fetchWithScrapeIO(url: string): Promise<string | null> {
    const html = await getUsingProxy({ url, json: false });
    if (html && html.trim().length > 0) return html;
    throw new Error('ScrapeIO returned empty HTML');
}

export async function fetchRenderedHtml(url: string): Promise<string> {
    const results = await fetchRenderedHtmlBoth(url);
    const pick = results.find(r => r.ok && r.html) || results.find(r => r.html) || null;
    if (pick?.html) return pick.html;
    throw new Error(`render failed (oxylabs ok=${results.find(r => r.provider === 'oxylabs')?.ok}, scrapeio ok=${results.find(r => r.provider === 'scrapeio')?.ok})`);
}

export async function fetchRenderedHtmlBoth(url: string): Promise<RenderResult[]> {
    const run = async (provider: RenderProvider): Promise<RenderResult> => {
        const t0 = Date.now();
        try {
            const html = provider === 'oxylabs'
                ? await fetchWithOxygen(url)
                : await fetchWithScrapeIO(url);
            return { provider, ok: !!html, html: html ?? null, ms: Date.now() - t0 };
        } catch (err: any) {
            return { provider, ok: false, html: null, ms: Date.now() - t0, error: err?.message || String(err) };
        }
    };
    const results = await Promise.all([run('oxylabs'), run('scrapeio')]);
    return results;
}

async function fetchWithOxygen(url: string): Promise<string | null> {
    if (!OXY_USERNAME || !OXY_PASSWORD) {
        throw new Error('Oxylabs/Oxygen credentials missing: set OXY_USERNAME and OXY_PASSWORD');
    }

    const renderBody = {
        source: 'universal',
        url,
        render: 'html',
        // parse: true,
    };

    const attempt = async (attemptIdx: number, body: any) => {
        const res = await fetch(OXY_REALTIME_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: basicAuthHeader(OXY_USERNAME, OXY_PASSWORD),
            },
            body: JSON.stringify(body),
        });

        const txt = await res.text();
        if (!res.ok) throw new Error(`Oxygen HTTP ${res.status} (attempt ${attemptIdx}): ${txt.slice(0, 400)}…`);
        return txt;
    };

    // Only try the render payload; retry with backoff on transient 5xx
    const payloads = [renderBody];
    let txt: string | null = null;
    let lastErr: any = null;

    for (let p = 0; p < payloads.length; p++) {
        const body = payloads[p];
        const maxAttempts = 3;
        for (let i = 1; i <= maxAttempts; i++) {
            try {
                txt = await attempt(i, body);
                lastErr = null;
                break;
            } catch (err: any) {
                lastErr = err;
                const msg = String(err?.message || '');
                if (i === maxAttempts || !/HTTP 5\d{2}/.test(msg)) {
                    // move to next payload or throw after loop
                    break;
                }
                const backoff = 500 * i + Math.floor(Math.random() * 300);
                await new Promise(res => setTimeout(res, backoff));
            }
        }
        if (txt) break;
    }

    if (!txt) {
        throw lastErr || new Error('Oxygen failed with no response');
    }

    let json: OxylabsResult;
    try { json = JSON.parse(txt); } catch {
        throw new Error(`Oxygen non-JSON response: ${txt.slice(0, 400)}…`);
    }

    const content = json?.results?.[0]?.content ?? '';
    return content && content.trim().length > 0 ? content : null;
}
