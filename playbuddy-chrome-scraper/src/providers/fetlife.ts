import { TEST_MODE } from '../config.js';
import type { EventResult } from '../types.js';
import { postStatus, openTab, sleep, getRandomDelay, throttleHourly } from '../utils.js';
import moment from 'moment-timezone';


function parseToISO(input: string): { start: string | null; end: string | null; error?: string; raw?: string } {
    const tz = 'America/New_York';
    const fmt = 'ddd, MMM D, YYYY h:mm A';

    const cleaned = input
        .replace(/\u00A0|\u2009|\u202F/g, ' ')
        .replace(/\u2013|\u2014/g, '-')
        .replace(/EDT|EST/g, '')
        .trim();

    const lines = cleaned
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    try {
        if (lines.length >= 3 && lines[0].toLowerCase().startsWith('starts in')) {
            const [, dateLine, timeRange] = lines;
            const [startTime, endTime] = timeRange.split('-').map((s) => s.trim());
            const start = moment.tz(`${dateLine} ${startTime}`, fmt, tz);
            const end = moment.tz(`${dateLine} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length === 1 && lines[0].includes(' at ') && lines[0].includes('-')) {
            const [datePart, timePart] = lines[0].split(' at ').map((s) => s.trim());
            const [startTime, endTime] = timePart.split('-').map((s) => s.trim());
            const start = moment.tz(`${datePart} ${startTime}`, fmt, tz);
            const end = moment.tz(`${datePart} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length === 2 && lines[1].includes('-')) {
            const [startTime, endTime] = lines[1].split('-').map((s) => s.trim());
            const start = moment.tz(`${lines[0]} ${startTime}`, fmt, tz);
            const end = moment.tz(`${lines[0]} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length >= 5 && lines[2].toLowerCase().startsWith('until')) {
            const start = moment.tz(`${lines[0]} ${lines[1]}`, fmt, tz);
            const end = moment.tz(`${lines[3]} ${lines[4]}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length >= 6 && lines[0].toLowerCase().startsWith('from') && lines[3].toLowerCase().startsWith('until')) {
            const start = moment.tz(`${lines[1]} ${lines[2]}`, fmt, tz);
            const end = moment.tz(`${lines[4]} ${lines[5]}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        throw new Error('Unrecognized datetime format');
    } catch (err: any) {
        return { start: null, end: null, error: err.message, raw: input };
    }
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
            const { start, end, error } = parseToISO(result.rawDatetime);
            result.start_date = start;
            result.end_date = end;

            if (error || !start || !end) {
                errors.push({ name: result.name, ticket_url: result.ticket_url, error });
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

        const { start, end, error } = parseToISO(result.rawDatetime);
        result.start_date = start;
        result.end_date = end;

        if (error || !start || !end) {
            errors.push({ name: result.name, ticket_url: result.ticket_url, error });
        }

        results.push(result);
        postStatus(`   ✅ Scraped "${result.name}"`);
    }

    return results;
}
