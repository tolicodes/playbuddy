import { isTestMode, MAX_EVENTS_KEY } from '../../config.js';
import { getRandomDelay, openTab, postStatus, sleep, throttleHourly, closeTab } from '../../utils.js';
import { DEFAULT_FESTIVAL_CAP, LOG_SKIP_REASONS, SIX_MONTHS_MS, VERBOSE_EVENT_LOGS } from './constants.js';
import { extractEventDetailFromPage, parseRawDatetime } from './parsers.js';
import { formatDate, updateTableProgress } from './table.js';
import type { EventResult } from '../../types.js';
import type { SkippedEntry, TableRow, TableRowStatus } from './types.js';

export async function scrapeFestivals(): Promise<EventResult[] & { skippedLog?: SkippedEntry[]; tableRows?: TableRow[] }> {
    const results: EventResult[] = [];
    const skippedLog: SkippedEntry[] = [];
    let tableRows: TableRow[] = [];
    const testMode = await isTestMode();
    let MAX_EVENTS = DEFAULT_FESTIVAL_CAP;
    try {
        const res = await chrome.storage.local.get(MAX_EVENTS_KEY);
        const n = Number(res[MAX_EVENTS_KEY]);
        if (Number.isFinite(n) && n > 0) {
            MAX_EVENTS = n;
        }
    } catch { /* ignore */ }
    const sixMonthsAhead = Date.now() + SIX_MONTHS_MS;

    const tab = await openTab('https://fetlife.com/events/near');
    try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* best effort */ }
    await sleep(800);

    const [{ result: links }]: any = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        args: [testMode],
        func: async (testModeFlag: boolean) => {
            async function sleep(ms: number) {
                return new Promise((resolve) => setTimeout(resolve, ms));
            }

            const normalize = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

            async function waitForButton(label: string, timeoutMs = 2500, intervalMs = 150) {
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
                const trigger = await (async () => {
                    const start = Date.now();
                    while (Date.now() - start < 1800) {
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
                    while (Date.now() - start < 3000) {
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
                if (!btn) {
                    console.warn(`Filter button not found for label "${label}"`);
                    return;
                }
                btn.click();
                await sleep(500);
            };

            await setDistance('500mi');
            await clickFilter('500m');
            await clickFilter('Conference / Festival');
            await sleep(1500);

            const scrollContainer = document.scrollingElement || document.body;
            const maxPasses = testModeFlag ? 3 : 20;
            let stagnant = 0;
            for (let i = 0; i < maxPasses; i++) {
                const before = document.querySelectorAll('.mt-2.cursor-pointer.rounded-sm.bg-gray-900').length;
                scrollContainer.scrollBy(0, 5000);
                await sleep(testModeFlag ? 2600 : 3500);
                const after = document.querySelectorAll('.mt-2.cursor-pointer.rounded-sm.bg-gray-900').length;
                if (after > before) {
                    stagnant = 0;
                } else {
                    stagnant += 1;
                    if (stagnant >= (testModeFlag ? 1 : 3)) break;
                }
            }

            const parseRsvps = (text: string | null | undefined) => {
                if (!text) return null;
                const nums = [...text.matchAll(/(\d+)/g)].map(n => Number(n[1])).filter(n => !Number.isNaN(n));
                return nums.length ? Math.max(...nums) : null;
            };

            return [...document.querySelectorAll('.mt-2.cursor-pointer.rounded-sm.bg-gray-900')].map((card) => {
                const link = (card.querySelector('a.link.text-red-500') as HTMLAnchorElement)?.href || null;
                const rsvpText = card.textContent || '';
                const title = (card.querySelector('h3 a') as HTMLAnchorElement)?.textContent?.trim() || (card.querySelector('h3')?.textContent?.trim()) || link;
                const type = (card.querySelector('[data-testid="category pill"]') as HTMLElement)?.textContent?.trim() || '';
                const dateText = (card.querySelector('div.flex.items-start.py-1 span.flex-auto') as HTMLElement)?.textContent?.trim() || '';
                return { url: link, rsvps: parseRsvps(rsvpText), title, type, dateText };
            }).filter(item => !!item.url);
        },
    });

    await closeTab(tab);
    const debugLinks = (links as any[]).slice(0, 10).map((l: any) => `${l.url || '?'} | rsvps=${l.rsvps ?? 'n/a'}`);
    postStatus(`🎪 Festivals page returned ${links.length} links (first few: ${debugLinks.join('; ')})`);

    tableRows = (links as any[]).map((l: any) => ({
        url: l?.url || '',
        name: l?.title || l?.url || '(pending)',
        organizer: '',
        status: 'pending' as TableRowStatus,
        reason: '',
        rsvps: typeof l?.rsvps === 'number' ? l.rsvps : null,
        type: l?.type || '',
        date: formatDate(undefined, l?.dateText || ''),
    }));

    const upsertTableRow = async (url: string, updates: Partial<TableRow>) => {
        const idx = tableRows.findIndex(r => r.url === url);
        if (idx >= 0) {
            tableRows[idx] = { ...tableRows[idx], ...updates };
        } else {
            tableRows.push({ url, status: 'pending', ...updates });
        }
        await updateTableProgress(results, skippedLog, tableRows);
    };

    let skippedLowRsvpList = 0;
    let skippedLowRsvpDetail = 0;
    let invalidDate = 0;
    let skippedFuture = 0;
    let skippedCap = 0;

    let processed = 0;
    const totalToProcess = Math.min((links as any[]).length, MAX_EVENTS);
    await updateTableProgress(results, skippedLog, tableRows);

    for (const item of links as any[]) {
        if (processed >= totalToProcess) break;
        const url = item.url as string;
        const listRsvps = typeof item.rsvps === 'number' ? item.rsvps : null;
        await throttleHourly();
        await getRandomDelay();

        const pct = Math.round(((processed + 1) / totalToProcess) * 100);
        if (VERBOSE_EVENT_LOGS) postStatus(`🎟️ Scraping festival ${processed + 1}/${totalToProcess} (${pct}%) ${url}`);
        const eventTab = await openTab(url);
        await sleep(3000);

        const [{ result }]: any = await chrome.scripting.executeScript({
            target: { tabId: eventTab.id! },
            func: extractEventDetailFromPage,
        });

        const parsedDateTime = parseRawDatetime(result.rawDatetime);
        result.start_date = parsedDateTime?.start;
        result.end_date = parsedDateTime?.end;
        result.type = 'retreat';

        if (!parsedDateTime?.start || !parsedDateTime?.end) {
            invalidDate += 1;
        }

        await closeTab(eventTab);

        const fallbackDate = tableRows.find(r => r.url === url)?.date || '';
        const dateOnly = formatDate(result.start_date, fallbackDate || result.rawDatetime || '');

        await upsertTableRow(url, {
            name: result.name || url,
            organizer: result.fetlife_handle || '',
            type: result.category || '',
            date: dateOnly,
        });

        const startTs = result.start_date ? new Date(result.start_date).getTime() : null;

        const markSkipped = async (reason: string) => {
            skippedLog.push({ reason, name: result.name, url, organizer: result.fetlife_handle });
            if (LOG_SKIP_REASONS) postStatus(`SKIP: ${reason} | ${result.name} | ${url}`);
            await upsertTableRow(url, {
                status: 'skipped',
                reason,
                name: result.name || url,
                organizer: result.fetlife_handle || '',
                type: result.category || '',
                date: dateOnly,
            });
        };

        if (!parsedDateTime?.start || !parsedDateTime?.end) {
            await markSkipped('invalid datetime');
        } else if (startTs && startTs > sixMonthsAhead) {
            skippedFuture += 1;
            await markSkipped('future>6mo');
        } else if (listRsvps !== null && listRsvps < 100) {
            skippedLowRsvpList += 1;
            const reason = `listRSVP<100${listRsvps !== null ? ` (${listRsvps})` : ''}`;
            await markSkipped(reason);
        } else if (typeof result.rsvp_count === 'number' && result.rsvp_count < 100) {
            skippedLowRsvpDetail += 1;
            const reason = `detailRSVP<100 (${result.rsvp_count})`;
            await markSkipped(reason);
        } else {
            results.push(result);
            await upsertTableRow(url, {
                status: 'scraped',
                reason: '',
                name: result.name || url,
                organizer: result.fetlife_handle || '',
                type: result.category || '',
                date: dateOnly,
            });
        }

        processed += 1;
        if (processed >= MAX_EVENTS) {
            postStatus(`⏹️ Reached festival cap of ${MAX_EVENTS} events; stopping.`);
            break;
        }
    }

    if ((links as any[]).length > totalToProcess) {
        const capReason = `not processed (cap ${MAX_EVENTS})`;
        const remaining = tableRows.filter(r => (r.status || 'pending') === 'pending');
        remaining.forEach(row => {
            row.status = 'skipped';
            row.reason = capReason;
            skippedLog.push({ reason: capReason, name: row.name || '', url: row.url || '', organizer: row.organizer || '' });
        });
        skippedCap = remaining.length;
        if (remaining.length) {
            await updateTableProgress(results, skippedLog, tableRows);
        }
    }

    postStatus(
        `🎪 Festival summary: found ${links.length}, scraped ${results.length} (cap ${MAX_EVENTS}), skipped list RSVPs<100 ${skippedLowRsvpList}, skipped detail RSVPs<100 ${skippedLowRsvpDetail}, skipped future>6mo ${skippedFuture}, invalid datetime ${invalidDate}${skippedCap ? `, not processed (cap) ${skippedCap}` : ''}`
    );

    return Object.assign(results, { skippedLog, tableRows });
}
