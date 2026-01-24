import axios from 'axios';
import { canonicalizeUrl } from '../ai/normalize.js';

const RESOLVE_TIMEOUT_MS = Number(process.env.URL_RESOLVE_TIMEOUT_MS || 8000);
const RESOLVE_MAX_REDIRECTS = Number(process.env.URL_RESOLVE_MAX_REDIRECTS || 6);

const resolvedCache = new Map<string, string>();

const extractResolvedUrl = (res: any): string | null =>
    res?.request?.res?.responseUrl || res?.request?._redirectable?._currentUrl || null;

const resolveWithHead = async (url: string): Promise<string> => {
    const res = await axios.head(url, {
        maxRedirects: RESOLVE_MAX_REDIRECTS,
        timeout: RESOLVE_TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 400,
    });
    return extractResolvedUrl(res) || url;
};

const resolveWithGet = async (url: string): Promise<string> => {
    const res = await axios.get(url, {
        maxRedirects: RESOLVE_MAX_REDIRECTS,
        timeout: RESOLVE_TIMEOUT_MS,
        responseType: 'stream',
        validateStatus: (status) => status >= 200 && status < 400,
    });
    if (res?.data?.destroy) res.data.destroy();
    return extractResolvedUrl(res) || url;
};

export const resolveRedirectedUrl = async (raw: string): Promise<string> => {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) return raw;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        // Validate the URL early; if it isn't a URL, just return the raw input.
        new URL(withScheme);
    } catch {
        return raw;
    }

    const cached = resolvedCache.get(withScheme);
    if (cached) return cached;

    try {
        const resolved = await resolveWithHead(withScheme);
        const canonical = canonicalizeUrl(resolved) ?? resolved;
        resolvedCache.set(withScheme, canonical);
        return canonical;
    } catch {
        try {
            const resolved = await resolveWithGet(withScheme);
            const canonical = canonicalizeUrl(resolved) ?? resolved;
            resolvedCache.set(withScheme, canonical);
            return canonical;
        } catch {
            const canonical = canonicalizeUrl(trimmed) ?? trimmed;
            resolvedCache.set(withScheme, canonical);
            return canonical;
        }
    }
};
