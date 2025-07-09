import type { EventResult } from '../types.js';
import { sleep, getRandomDelay, openTab, postStatus, throttleHourly } from '../utils.js';

export function parseEventTimes(raw: string): { start: Date; end: Date } {
    // Normalize whitespace
    const clean = raw.trim().replace(/\s+/g, ' ');

    // Match format: "Tue Jul 29, 2025 7:00 PM - 11:00 PM"
    const match = clean.match(/^([A-Za-z]{3} [A-Za-z]{3} \d{1,2}, \d{4}) (\d{1,2}:\d{2} [AP]M) - (\d{1,2}:\d{2} [AP]M)$/);
    if (!match) throw new Error('Invalid datetime format');

    const [_, dateStr, startTimeStr, endTimeStr] = match;

    const start = new Date(`${dateStr} ${startTimeStr}`);
    const end = new Date(`${dateStr} ${endTimeStr}`);

    // Handle case where end time is technically past midnight (e.g. 7 PM - 2 AM)
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }

    return { start, end };
}


export async function scrapeEvents(urls: string[]): Promise<EventResult[]> {
    const events: EventResult[] = [];
    const errors: any[] = [];

    for (const url of urls) {
        try {
            await throttleHourly();
            await getRandomDelay();

            const tab = await openTab(url);
            await sleep(3000);

            const [injectionResult] = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                func: () => {

                    const data = {
                        name: document.querySelector('h1.hero__title')?.textContent?.trim() || null,
                        datetime: document.querySelector('.event-meta__date')?.textContent?.trim() || null,
                        location: document.querySelector('.event-meta__location')?.textContent?.trim() || null,
                        image: document.querySelector('.hero__slide-image img')?.getAttribute('src') || null,
                        description_html: null as string | null,
                    };

                    const descNode = document.querySelector('.event-page-description');
                    if (descNode) {
                        data.description_html = descNode.innerHTML;
                    }

                    return data;
                }
            });

            const event = injectionResult?.result;
            if (event) {
                const { start, end } = parseEventTimes(event.datetime!);

                const mappedEvent = {
                    name: event.name,
                    location: event.location,
                    description_html: event.description_html,
                    image: event.image,
                    start_date: start.toISOString(),
                    end_date: end.toISOString(),
                    ticket_url: url,
                }
                events.push(mappedEvent);
                postStatus(`   ✔️ ${url}: ${event.name}`);
            }
        } catch (err: any) {
            postStatus(`   ❌ Failed to scrape ${url}: ${err.message}`);
            errors.push({ url, error: err.message });
        }
    }
    return events;
}
