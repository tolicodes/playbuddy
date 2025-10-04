// src/scrapers/ai/debug.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const DEBUG = true;
export const DEBUG_VERBOSE = true;
export const DEBUG_SAVE_HTML = true;

export function dbg(label: string, obj?: unknown) {
    if (!DEBUG) return;
    if (obj === undefined) console.log(`DBG: ${label}`);
    else console.log(`DBG: ${label}:`, safeJson(obj));
}

export function safeJson(v: unknown, max = 10_000) {
    try {
        const s = JSON.stringify(v, null, 2);
        return s.length > max ? s.slice(0, max) + ` …[+${s.length - max} chars]` : s;
    } catch {
        return String(v);
    }
}

export async function saveLogFile(basename: string, ext: string, content: string) {
    if (!DEBUG_SAVE_HTML) return null;
    const dir = path.resolve('.logs');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${basename}${ext}`);
    await fs.writeFile(file, content);
    return file;
}

export function stableNameFrom(url: string, html: string) {
    const h = crypto.createHash('sha1').update(url).update(html.slice(0, 20000)).digest('hex').slice(0, 10);
    const u = new URL(url);
    const host = u.hostname.replace(/\W+/g, '-');
    const pathSafe = u.pathname.replace(/\W+/g, '-').slice(0, 40) || 'root';
    return `${host}${pathSafe ? '-' + pathSafe : ''}-${h}`;
}
