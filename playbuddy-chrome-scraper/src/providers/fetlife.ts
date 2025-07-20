import { TEST_MODE } from '../config.js';
import type { EventResult } from '../types.js';
import { postStatus, openTab, sleep, getRandomDelay, throttleHourly } from '../utils.js';
import moment from 'moment-timezone';

/**
 * Parses a rawDatetime string into ISO start and end datetimes in UTC.
 * Supports all known FetLife datetime formats.
 *
 * @param {string} rawDatetime - The raw datetime string (e.g. "Thu, Jul 17, 2025 at 7:00 PM - 10:30 PM")
 * @param {string} timezone - IANA timezone string (default: 'America/New_York')
 * @returns {{ start: string, end: string } | null}
 */
export function parseRawDatetime(rawDatetime: string, timezone = 'America/New_York') {
    if (!rawDatetime) return null;

    // Replace non-breaking spaces
    const raw = rawDatetime.replace(/\u00a0/g, ' ').trim();

    let startStr, endStr;

    if (raw.startsWith('From:')) {
        // Format: From: Sat, Jul 19, 2025 at 7:00 PM Until: Sun, Jul 20, 2025 at 12:00 AM
        const match = raw.match(/From:\s*(.+?)\s*Until:\s*(.+)/);
        if (!match) return null;
        [, startStr, endStr] = match;
    } else {
        // Format: Thu, Jul 17, 2025 at 7:00 PM - 10:30 PM
        const match = raw.match(/^(.+?) at (.+?) - (.+)$/);
        if (!match) return null;

        const [, datePart, startTime, endTime] = match;
        startStr = `${datePart} at ${startTime}`;
        endStr = `${datePart} at ${endTime}`;
    }

    const start = moment.tz(startStr, 'ddd, MMM D, YYYY [at] h:mm A', timezone);
    const end = moment.tz(endStr, 'ddd, MMM D, YYYY [at] h:mm A', timezone);

    // If end is before start (e.g. 7 PM - 2 AM), add a day to end
    if (end.isBefore(start)) {
        end.add(1, 'day');
    }

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}



function extractEventDetailFromPage(): EventResult {
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

    return {
        name: document.querySelector('h1.break-words.text-left')?.textContent?.trim() || '',
        rawDatetime: ps[2]?.textContent?.trim() || fallbackDatetime || '',
        location: cleanHtml(ps[3]?.innerHTML || ''),
        category,
        description: cleanHtml(document.querySelector('div.story__copy')?.innerHTML || ''),
        ticket_url: location.href,
        fetlife_handle: organizerLink?.textContent?.trim() || null,
        organizer_href: organizerLink?.href || null,
    };
}

export async function scrapeEvents(handles: string[]): Promise<EventResult[]> {
    const results: EventResult[] = [];
    const errors: any[] = [];

    console.log('fet handles', handles);

    for (const handle of handles) {
        postStatus(`🔍 Fetching events for ${handle}`);
        await getRandomDelay();

        const tab = await openTab(`https://fetlife.com/${handle}`);
        await sleep(3000);

        const [{ result: links }]: any = await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            func: async () => {
                async function retryUntilTruthy(fn: () => any, max = 10, delay = 500) {
                    for (let i = 0; i < max; i++) {
                        const val = fn();
                        if (val) return val;
                        await new Promise((res) => setTimeout(res, delay));
                    }
                    return null;
                }

                const header = await retryUntilTruthy(() =>
                    Array.from(document.querySelectorAll('h6')).find((h) => h.textContent?.trim() === 'Events Organizing')
                );
                const container = header?.parentElement?.nextElementSibling;
                if (!container) return [];

                const viewAll = Array.from(container.querySelectorAll('a')).find((a) =>
                    (a as HTMLElement).textContent?.trim().toLowerCase().startsWith('view all')
                );
                if (viewAll) {
                    (viewAll as HTMLElement).click();
                    await new Promise((res) => setTimeout(res, 1000));
                }

                return Array.from(container.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).href);
            },
        });

        for (const url of links) {
            await throttleHourly();
            await getRandomDelay();

            postStatus(`    – Scraping ${url}`);
            const eventTab = await openTab(url);
            await sleep(3000);

            const [{ result }]: any = await chrome.scripting.executeScript({
                target: { tabId: eventTab.id! },
                func: extractEventDetailFromPage,
            });

            result.fetlife_handle = handle;
            const parsedDateTime = parseRawDatetime(result.rawDatetime);

            result.start_date = parsedDateTime?.start;
            result.end_date = parsedDateTime?.end;

            if (!parsedDateTime?.start || !parsedDateTime?.end) {
                errors.push({ name: result.name, ticket_url: result.ticket_url, error: 'Invalid datetime' });
            }

            results.push(result);
            postStatus(`       ✔️ Scraped "${result.name}"`);
        }
    }

    return results;
}

export async function scrapeNearbyEvents(): Promise<EventResult[]> {
    const results: EventResult[] = [];
    const errors: any[] = [];

    const tab = await openTab('https://fetlife.com/events/near');
    await sleep(3000);

    const [{ result: links }]: any = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: async () => {
            async function sleep(ms: number) {
                return new Promise((resolve) => setTimeout(resolve, ms));
            }

            const clickFilter = (label: string) => {
                const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
                if (btn) btn.click();
            };

            clickFilter('5m');
            clickFilter('Educational');
            clickFilter('Social');
            clickFilter('Conference / Festival');
            await sleep(5000);

            const scrollContainer = document.scrollingElement || document.body;
            for (let i = 0; i < (TEST_MODE ? 2 : 20); i++) {
                scrollContainer.scrollBy(0, 5000);
                await sleep(3000);
            }

            return [...document.querySelectorAll('.mt-2.cursor-pointer.rounded-sm.bg-gray-900')]
                .map((card) => (card.querySelector('a.link.text-red-500') as HTMLAnchorElement)?.href)
                .filter(Boolean);
        },
    });

    for (const url of links) {
        await throttleHourly();
        await getRandomDelay();

        postStatus(`📍 Scraping ${url}`);
        const eventTab = await openTab(url);
        await sleep(3000);

        const [{ result }]: any = await chrome.scripting.executeScript({
            target: { tabId: eventTab.id! },
            func: extractEventDetailFromPage,
        });

        const parsedDateTime = parseRawDatetime(result.rawDatetime);
        result.start_date = parsedDateTime?.start;
        result.end_date = parsedDateTime?.end;

        if (!parsedDateTime?.start || !parsedDateTime?.end) {
            errors.push({ name: result.name, ticket_url: result.ticket_url, error: 'Invalid datetime' });
        }

        results.push(result);
        postStatus(`   ✅ Scraped "${result.name}"`);
    }

    return results;
}
