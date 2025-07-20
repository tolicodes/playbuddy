import { scrapeTicketSite as scrapeFromTicketSites } from '../ticketSiteMapper.js';
import type { EventResult, Link } from '../types.js';
import { sleep, getRandomDelay, openTab, postStatus, throttleHourly } from '../utils.js';

export async function scrapeLinktree(usernames: string[]): Promise<EventResult[]> {
    const results: EventResult[] = [];
    const errors: any[] = [];
    const allLinks: Link[] = [];

    for (const username of usernames) {
        const url = `https://linktr.ee/${username}`;
        postStatus(`🌳 Scraping Linktree: @${username}`);

        try {
            await throttleHourly();
            await getRandomDelay();

            const tab = await openTab(url);
            await sleep(3000);

            const [injectionResult] = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                args: [username],
                func: (username: string) => {
                    const links: Link[] = [];
                    const buttons = document.querySelectorAll('[data-testid="LinkButton"]');

                    buttons.forEach(button => {
                        const aTag = button.tagName === 'A' ? button : button.querySelector('a');
                        const href = aTag?.getAttribute('href') ?? '';
                        const title = button.querySelector('p')?.textContent?.trim() ?? '';

                        if (href && title) {
                            links.push({
                                url: href,
                                name: title,
                                handle: username,
                            });
                        }
                    });

                    return links;
                },
            });

            const links = injectionResult?.result ?? [];

            allLinks.push(...links);
            results.push(...links.map(link => ({ linktree_handle: username, ...link })));
        } catch (err: any) {
            postStatus(`   ❌ Failed to scrape @${username}: ${err.message}`);
            errors.push({ username, error: err.message });
        }
    }

    let events: EventResult[] = [];
    try {
        events = await scrapeFromTicketSites(allLinks);
    } catch (err) {
        postStatus(`❌ Error scraping ticket site: ${(err as Error).message}`);
    }

    return events;
}
