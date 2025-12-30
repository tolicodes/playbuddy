import moment from 'moment-timezone';
import type { EventResult } from '../../types.js';

export function isTargetLocation(location: string | null | undefined): boolean {
    if (!location) return false;
    const loc = location.toLowerCase();
    if (loc.includes('new jersey')) return false;
    return loc.includes('new york');
}

export function isBdsmparty(category: string | null | undefined): boolean {
    if (!category) return false;
    return category.trim().toLowerCase() === 'bdsm party';
}

export function getListRsvpThreshold(category: string | null | undefined): number {
    return isBdsmparty(category) ? 50 : 10;
}

export function meetsBdsmpartyThreshold(ev: { category?: string | null; rsvp_count?: number | null }): boolean {
    if (!isBdsmparty(ev.category)) return true;
    const r = typeof ev.rsvp_count === 'number' ? ev.rsvp_count : Number(ev.rsvp_count || 0);
    return r > 50;
}

/**
 * Parses a rawDatetime string into ISO start and end datetimes in UTC.
 * Supports all known FetLife datetime formats.
 */
export function parseRawDatetime(rawDatetime: string, timezone = 'America/New_York') {
    if (!rawDatetime) return null;
    const raw = rawDatetime.replace(/\u00a0/g, ' ').trim();
    let startStr, endStr;

    if (raw.startsWith('From:')) {
        const match = raw.match(/From:\s*(.+?)\s*Until:\s*(.+)/);
        if (!match) return null;
        [, startStr, endStr] = match;
    } else {
        const match = raw.match(/^(.+?) at (.+?) - (.+)$/);
        if (!match) return null;
        const [, datePart, startTime, endTime] = match;
        startStr = `${datePart} at ${startTime}`;
        endStr = `${datePart} at ${endTime}`;
    }

    const start = moment.tz(startStr, 'ddd, MMM D, YYYY [at] h:mm A', timezone);
    const end = moment.tz(endStr, 'ddd, MMM D, YYYY [at] h:mm A', timezone);
    if (end.isBefore(start)) end.add(1, 'day');

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}

export function extractEventDetailFromPage(): EventResult {
    function cleanHtml(html: string | null): string {
        const tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        tmp.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
        tmp.querySelectorAll('p').forEach((p) => {
            const txt = p.textContent?.trim() || '';
            p.replaceWith(txt + '\n');
        });
        return tmp.textContent?.trim() || '';
    }

    const ps = Array.from(document.querySelectorAll('p.pt-px.text-sm.text-gray-200'));

    const fallbackDatetime = (() => {
        const startsInEl = Array.from(document.querySelectorAll('p')).find((el) =>
            el.textContent?.toLowerCase().includes('starts in')
        );
        const sibling = startsInEl?.closest('div')?.querySelector('.text-gray-200');
        return sibling?.textContent?.trim() || '';
    })();

    const category = cleanHtml(
        (document.querySelectorAll('.text-gray-200.text-sm.flex-auto.break-words')[5] as HTMLElement)?.innerHTML || ''
    );

    const blocks = Array.from(document.querySelectorAll('.text-gray-200'));
    const orgBlock = blocks.find((b) => b.textContent?.includes('Organized by'));
    const organizerLink = orgBlock?.querySelector('a');

    const rsvpCount = (() => {
        const candidates = Array.from(document.querySelectorAll('span, div, p, h6, strong')).map((el) =>
            el.textContent?.trim() || ''
        );
        const patterns = [
            /(\d+)\s*(?:rsvps?|rsvped|going|attending)/i,
            /rsvps?\s*\(?(\d+)\)?/i,
        ];
        const extractMaxFromText = (text: string) => {
            if (!/rsvp|going|attending/i.test(text)) return null;
            const nums = (text.match(/\d+/g) || []).map(n => Number(n)).filter(n => !Number.isNaN(n));
            return nums.length ? Math.max(...nums) : null;
        };
        for (const text of candidates) {
            const max = extractMaxFromText(text);
            if (max !== null) return max;
            for (const pat of patterns) {
                const match = text.match(pat);
                if (match) return Number(match[1]);
            }
        }
        const bodyText = document.body?.innerText || '';
        const bodyMax = extractMaxFromText(bodyText);
        if (bodyMax !== null) return bodyMax;
        for (const pat of patterns) {
            const match = bodyText.match(pat);
            if (match) return Number(match[1]);
        }
        return null;
    })();

    return {
        name: document.querySelector('h1.break-words.text-left')?.textContent?.trim() || '',
        rawDatetime: ps[2]?.textContent?.trim() || fallbackDatetime || '',
        location: cleanHtml(ps[3]?.innerHTML || ''),
        category,
        description: cleanHtml(document.querySelector('div.story__copy')?.innerHTML || ''),
        ticket_url: location.href,
        fetlife_handle: organizerLink?.textContent?.trim() || null,
        organizer_href: organizerLink?.href || null,
        rsvp_count: rsvpCount,
    };
}
