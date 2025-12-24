import { TEST_MODE } from '../config.js';
import type { EventResult } from '../types.js';
import { postStatus, openTab, sleep, getRandomDelay, throttleHourly, closeTab } from '../utils.js';
import moment from 'moment-timezone';

function isTargetLocation(location: string | null | undefined): boolean {
    if (!location) return false;
    const loc = location.toLowerCase();
    return loc.includes('new york');
}

function isBdsmparty(category: string | null | undefined): boolean {
    if (!category) return false;
    return category.trim().toLowerCase() === 'bdsm party';
}

function meetsBdsmpartyThreshold(ev: { category?: string | null; rsvp_count?: number | null }): boolean {
    if (!isBdsmparty(ev.category)) return true;
    const r = typeof ev.rsvp_count === 'number' ? ev.rsvp_count : Number(ev.rsvp_count || 0);
    return r > 50;
}

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

    const rsvpCount = (() => {
        const candidates = Array.from(document.querySelectorAll('span, div, p, h6, strong')).map((el) =>
            el.textContent?.trim() || ''
        );
        const patterns = [
            /(\d+)\s*(?:rsvps?|rsvped|going|attending)/i,
            /rsvps?\s*\(?(\d+)\)?/i,
        ];
        for (const text of candidates) {
            for (const pat of patterns) {
                const match = text.match(pat);
                if (match) return Number(match[1]);
            }
        }
        const bodyText = document.body?.innerText || '';
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

        await closeTab(tab);
        postStatus(`🔎 Found ${links.length} event links for ${handle} (first few: ${links.slice(0, 5).join(', ')})`);

        let skippedNJ = 0;
        let skippedBDSM = 0;
        let invalidDate = 0;

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

            await closeTab(eventTab);

            result.fetlife_handle = handle;
            const parsedDateTime = parseRawDatetime(result.rawDatetime);

            result.start_date = parsedDateTime?.start;
            result.end_date = parsedDateTime?.end;

            if (!parsedDateTime?.start || !parsedDateTime?.end) {
                errors.push({ name: result.name, ticket_url: result.ticket_url, error: 'Invalid datetime' });
                invalidDate += 1;
            }

            if (!isTargetLocation(result.location)) {
                postStatus(`       ⏭️ Skipping non-NY event "${result.name}"`);
                skippedNJ += 1;
            } else if (!meetsBdsmpartyThreshold(result)) {
                postStatus(`       ⏭️ Skipping BDSM Party under 50 RSVPs: "${result.name}"`);
                skippedBDSM += 1;
            } else {
                if (result.category) postStatus(`       • Type: ${result.category}`);
                results.push(result);
                postStatus(`       ✔️ Scraped "${result.name}"`);
            }
        }

        const scrapedCount = results.length;
        postStatus(
        `📊 Summary for ${handle}: found ${links.length}, scraped ${scrapedCount}, skipped non-NY ${skippedNJ}, skipped low-RSVP BDSM ${skippedBDSM}, invalid datetime ${invalidDate}`
        );
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

            const normalize = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

            async function waitForButton(label: string, timeoutMs = 15000, intervalMs = 250) {
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    const btn = [...document.querySelectorAll('button')].find(
                        (b) => normalize(b.textContent) === normalize(label)
                    );
                    if (btn) return btn as HTMLButtonElement;
                    await sleep(intervalMs);
                }
                return null;
            }

            async function setDistance(label: string) {
                // Open the distance dropdown (shows current like "50mi")
                const trigger = await (async () => {
                    const start = Date.now();
                    while (Date.now() - start < 4000) {
                        const match = [...document.querySelectorAll('a.link, button, div')].find((el) => {
                            const txt = normalize(el.textContent);
                            return /\d+mi/.test(txt) || txt.includes('mi');
                        });
                        if (match) return match as HTMLElement;
                        await sleep(250);
                    }
                    return null;
                })();
                if (!trigger) return;
                trigger.click();
                await sleep(300);

                const option = await (async () => {
                    const start = Date.now();
                    while (Date.now() - start < 8000) {
                        const found = [...document.querySelectorAll('a.dropdown-menu-entry, a[range] span, span')]
                            .map((el) => el.closest('a.dropdown-menu-entry') || (el.parentElement?.closest('a.dropdown-menu-entry') as HTMLElement | null) || null)
                            .filter(Boolean) as HTMLElement[];
                        const match = found.find((el) => normalize(el.textContent) === normalize(label));
                        if (match) return match;
                        await sleep(200);
                    }
                    return null;
                })();
                if (!option) return;
                option.click();
                await sleep(500);
            }

            const clickFilter = async (label: string) => {
                const btn = await waitForButton(label);
                if (!btn) return;
                btn.click(); // single click to avoid toggling off
                await sleep(500);
            };

            await setDistance('5mi');
            await clickFilter('5m'); // can load late; wait for it explicitly
            await clickFilter('Educational');
            await clickFilter('Social');
            await clickFilter('Conference / Festival');
            await clickFilter('BDSM Party');
            await sleep(8000); // give filters time to apply and results to hydrate

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

    await closeTab(tab);
    postStatus(`🔍 Nearby page returned ${links.length} links (first few: ${links.slice(0, 5).join(', ')})`);

    let skippedNJ = 0;
    let skippedBDSM = 0;
    let invalidDate = 0;

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
            invalidDate += 1;
        }

        await closeTab(eventTab);

        if (!isTargetLocation(result.location)) {
            postStatus(`   ⏭️ Skipping non-NY event "${result.name}"`);
            skippedNJ += 1;
        } else if (!meetsBdsmpartyThreshold(result)) {
            postStatus(`   ⏭️ Skipping BDSM Party under 50 RSVPs: "${result.name}"`);
            skippedBDSM += 1;
        } else {
            if (result.category) postStatus(`   • Type: ${result.category}`);
            results.push(result);
            postStatus(`   ✅ Scraped "${result.name}"`);
        }
    }

    postStatus(
        `📈 Nearby summary: found ${links.length}, scraped ${results.length}, skipped non-NY ${skippedNJ}, skipped low-RSVP BDSM ${skippedBDSM}, invalid datetime ${invalidDate}`
    );

    return results;
}
