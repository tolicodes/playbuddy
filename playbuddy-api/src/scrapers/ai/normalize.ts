// src/scrapers/ai/normalize.ts
import type { NormalizedEventInput } from '../../commonTypes.js';

export function classifyPlatform(url: string): string {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('eventbrite')) return 'Eventbrite';
    if (host.includes('tickettailor') || host.includes('buytickets.at')) return 'TicketTailor';
    if (host.includes('forbiddentickets')) return 'ForbiddenTickets';
    if (host.includes('plura')) return 'Plura';
    if (host.includes('dice.fm')) return 'DICE';
    if (host.includes('withfriends')) return 'WithFriends';
    if (host.includes('lu.ma')) return 'Luma';
    if (host.includes('partiful')) return 'Partiful';
    if (host.includes('meetup')) return 'Meetup';
    if (host.includes('ra.co')) return 'ResidentAdvisor';
    return 'Unknown';
}

export function deriveOriginalId(url: string, platform: string): string | null {
    try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1] || '';
        const num = last.match(/\d{5,}/)?.[0];
        if (num) return `${platform.toLowerCase()}-${num}`;
        return `${u.hostname.replace(/\W+/g, '-')}-${parts.join('-').slice(0, 40)}`.toLowerCase();
    } catch { return null; }
}

export function deriveOrganizerOriginalId(orgUrl: string | null, platform: string): string | null {
    if (!orgUrl) return null;
    try {
        const u = new URL(orgUrl);
        const m = u.pathname.match(/\/o\/.*-(\d+)$/);
        if (m) return `${platform.toLowerCase()}-${m[1]}`;
    } catch { }
    return null;
}

export function toISO(val: any): string | null {
    if (!val || typeof val !== 'string') return null;
    const d = new Date(val);
    return Number.isNaN(+d) ? null : d.toISOString();
}

export function isStartFuture(startISO: string, nowISO: string) {
    const s = Date.parse(startISO);
    if (Number.isNaN(s)) return true;
    return s >= Date.parse(nowISO);
}

export function isFutureEvent(ev: NormalizedEventInput, nowISO: string) {
    if (ev.start_date) return isStartFuture(ev.start_date, nowISO);
    return true;
}

export function isRetreatByDuration(startISO: string | null, endISO: string | null): boolean {
    if (!startISO || !endISO) return false;
    const ms = +new Date(endISO) - +new Date(startISO);
    return ms > 24 * 60 * 60 * 1000;
}

export function canonicalUrlKey(raw: string): string {
    try {
        const u = new URL(raw);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'mc_cid', 'mc_eid', 'fbclid', 'gclid']
            .forEach(p => u.searchParams.delete(p));
        if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
        return u.toString();
    } catch {
        return raw;
    }
}
