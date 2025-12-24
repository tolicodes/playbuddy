import { cleanHtml } from './html.js';
import { stableNameFrom } from './debug.js';

export function prepTruncated(html: string, baseUrl: string) {
    const cleaned = cleanHtml(html)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        // strip CMP/cookie tables and tracker ids
        .replace(/<div[^>]*>[^<]*Maximum Storage Duration[\s\S]*?<\/div>/gi, '')
        .replace(/ttcsid_[A-Z0-9]+/gi, '');
    const truncated = cleaned.slice(0, 120000);
    const stripAttrsKeepHrefSrc = (frag: string) =>
        frag.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (_m, tag, attrs) => {
            const keep: string[] = [];
            const keepAttr = (name: string) => {
                const match = attrs.match(new RegExp(`\\s+${name}=("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'));
                if (match) keep.push(` ${name}=${match[1]}`);
            };
            keepAttr('href');
            keepAttr('src');
            keepAttr('alt');
            return `<${tag}${keep.join('')}>`;
        });

    const truncatedStripped = stripAttrsKeepHrefSrc(truncated);
    const baseName = stableNameFrom(baseUrl, truncatedStripped);
    const jsonBlobs = Array.from(
        html.matchAll(/<script[^>]*(application\/ld\+json|server_data|serverData)[^>]*>([\s\S]*?)<\/script>/gi)
    ).map(m => (m[2] || '').trim()).filter(Boolean).map(s => s.slice(0, 20000));

    return { truncatedStripped, truncated, baseName, jsonBlobs };
}
