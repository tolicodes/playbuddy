import { getRandomDelay, openTab, postStatus, sleep, throttleHourly, closeTab } from '../../utils.js';
import { parseRawDatetime, extractEventDetailFromPage, isTargetLocation, meetsBdsmpartyThreshold } from './parsers.js';
import { VERBOSE_EVENT_LOGS } from './constants.js';
import { updateTableProgress } from './table.js';
import type { EventResult } from '../../types.js';
import type { SkippedEntry } from './types.js';

export async function scrapeEvents(handles: string[]): Promise<EventResult[] & { skippedLog?: SkippedEntry[] }> {
    const results: EventResult[] = [];
    const skippedLog: SkippedEntry[] = [];

    console.log('fet handles', handles);

    await updateTableProgress(results, skippedLog);

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
        const debugLinks = links.slice(0, 10).map((u: string) => u);
        postStatus(`🔎 Found ${links.length} event links for ${handle} (first few: ${debugLinks.join(', ')})`);

        let skippedNJ = 0;
        let skippedBDSM = 0;
        let invalidDate = 0;

        for (const url of links) {
            await throttleHourly();
            await getRandomDelay();

            if (VERBOSE_EVENT_LOGS) postStatus(`    – Scraping ${url}`);
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
                invalidDate += 1;
                skippedLog.push({ reason: 'invalid datetime', name: result.name, url, organizer: result.fetlife_handle || handle });
                await updateTableProgress(results, skippedLog);
            } else if (!isTargetLocation(result.location)) {
                skippedNJ += 1;
                skippedLog.push({ reason: `non-NY${result.location ? ` (${result.location})` : ''}`, name: result.name, url, organizer: result.fetlife_handle || handle });
                await updateTableProgress(results, skippedLog);
            } else if (!meetsBdsmpartyThreshold(result)) {
                skippedBDSM += 1;
                skippedLog.push({ reason: 'BDSM<50', name: result.name, url, organizer: result.fetlife_handle || handle });
                await updateTableProgress(results, skippedLog);
            } else {
                results.push(result);
                await updateTableProgress(results, skippedLog);
            }
        }

        const scrapedCount = results.length;
        postStatus(
            `📊 Summary for ${handle}: found ${links.length}, scraped ${scrapedCount}, skipped non-NY ${skippedNJ}, skipped low-RSVP BDSM ${skippedBDSM}, invalid datetime ${invalidDate}`
        );
    }

    return Object.assign(results, { skippedLog });
}
