// src/scrapers/ai/html.ts
const BLOCK_TAGS = [
    'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul', 'li',
    'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
];

export function cleanHtml(html: string): string {
    // 1) remove noisy nodes
    let s = html
        .replace(/<!--([\s\S]*?)-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

    // 2) keep only <body> if present
    const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (body) s = body[1];

    // 3) drop huge hidden SVG sprites & base64 images (noise)
    s = s.replace(/<svg[^>]*>(?:[\s\S]*?<symbol[\s\S]*?<\/symbol>)+[\s\S]*?<\/svg>/gi, '');
    s = s.replace(/<svg[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi, '');
    s = s.replace(/<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/gi, '');

    // 4) normalize <br> to explicit line breaks so they survive LLM compression
    s = s.replace(/<br\s*\/?>/gi, '\n');

    // 5) pad block tags with newlines to preserve paragraph/list structure
    s = padBlockTagsWithNewlines(s);

    // 6) normalize whitespace WITHOUT collapsing paragraph breaks
    s = s
        .replace(/[ \t]{2,}/g, ' ')  // collapse long runs of spaces/tabs
        .replace(/\r\n/g, '\n')      // normalize newlines
        .replace(/\n{3,}/g, '\n\n')  // keep at most double newlines
        .trim();

    return s;
}

function padBlockTagsWithNewlines(input: string): string {
    let out = input;
    for (const tag of BLOCK_TAGS) {
        const open = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
        const close = new RegExp(`</${tag}>`, 'gi');
        out = out.replace(open, match => `\n${match}`);
        out = out.replace(close, match => `${match}\n`);
    }
    return out;
}

export function safeParseJsonObject(txt: string): Record<string, any> | null {
    const direct = tryJson(txt);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;

    const fence = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) {
        const fenced = tryJson(fence[1]);
        if (fenced && typeof fenced === 'object' && !Array.isArray(fenced)) return fenced;
    }
    const first = txt.indexOf('{');
    const last = txt.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
        const maybe = tryJson(txt.slice(first, last + 1));
        if (maybe && typeof maybe === 'object' && !Array.isArray(maybe)) return maybe;
    }
    return null;
}

function tryJson(s: string) { try { return JSON.parse(s); } catch { return null; } }
