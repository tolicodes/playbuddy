// src/scrapers/ai/fetchers.ts
import fetch from 'node-fetch';
import { dbg } from './debug.js';
import { OXY_REALTIME_URL, OXY_USERNAME, OXY_PASSWORD } from './config.js';
import { getUsingProxy } from '../../helpers/getUsingProxy.js';

function basicAuthHeader(user: string, pass: string) {
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

type OxylabsResult = {
    results?: Array<{ content?: string; status_code?: number }>;
};

export async function fetchRenderedHtml(url: string): Promise<string> {
    // 1) Try Oxygen (single attempt)
    try {
        const html = await fetchWithOxygen(url);
        if (html && html.length >= 100) {
            dbg('Fetched with Oxygen');
            return html;
        }
        dbg('Oxygen returned empty/short content — falling back to ScrapeDo');
    } catch (e) {
        dbg('Oxygen failed — falling back to ScrapeDo', e);
    }

    // 2) Fallback: ScrapeDo
    return await getUsingProxy({ url, json: false });
}

async function fetchWithOxygen(url: string): Promise<string | null> {
    if (!OXY_USERNAME || !OXY_PASSWORD) {
        throw new Error('Oxylabs/Oxygen credentials missing: set OXY_USERNAME and OXY_PASSWORD');
    }

    const body = {
        source: 'universal',
        url,
        render: 'html',           // enable JS rendering
        follow_redirects: true,
        user_agent_type: 'desktop',
        parse: false,
        xhr: false,
        markdown: false,
    };

    const res = await fetch(OXY_REALTIME_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: basicAuthHeader(OXY_USERNAME, OXY_PASSWORD),
        },
        body: JSON.stringify(body),
    });

    const txt = await res.text();
    if (!res.ok) throw new Error(`Oxygen HTTP ${res.status}: ${txt.slice(0, 400)}…`);

    let json: OxylabsResult;
    try { json = JSON.parse(txt); } catch {
        throw new Error(`Oxygen non-JSON response: ${txt.slice(0, 400)}…`);
    }

    const content = json?.results?.[0]?.content ?? '';
    return content && content.trim().length > 0 ? content : null;
}
