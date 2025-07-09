import { scrapeTicketSite as scrapeFromTicketSites } from '../ticketSiteMapper.js';
import type { EventResult } from '../types.js';
import { sleep, getRandomDelay, openTab, postStatus, throttleHourly } from '../utils.js';

interface InstagramLink {
    url: string;
    title: string;
}

export async function scrapeInstagram(usernames: string[]): Promise<EventResult[]> {
    const results: EventResult[] = [];
    const errors: any[] = [];

    const allLinks: string[] = [];

    for (const username of usernames) {
        const url = `https://www.instagram.com/${username}/`;
        postStatus(`📸 Scraping @${username}`);

        try {
            await throttleHourly();
            await getRandomDelay();

            const tab = await openTab(url);
            await sleep(3000);

            // @ts-ignore
            const [injectionResult]: { result: InstagramLink[] }[] = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                func: () => {
                    function clickLinkIcon() {
                        const linkIcon = document.querySelector('svg[aria-label="Link icon"]');
                        const clickableSpan = linkIcon?.closest('button, span')?.parentElement;
                        if (clickableSpan) clickableSpan.click();
                    }

                    function sleep(ms: number) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }

                    return new Promise(async (resolve) => {
                        clickLinkIcon();

                        for (let i = 0; i < 10; i++) {
                            const h2 = [...document.querySelectorAll('h2')].find(h => h?.textContent?.trim() === 'Links');
                            if (h2) break;
                            await sleep(200);
                        }

                        const h2 = [...document.querySelectorAll('h2')].find(h => h?.textContent?.trim() === 'Links');
                        if (!h2) return resolve([]);

                        const block = h2.parentElement?.parentElement;
                        if (!block) return resolve([]);

                        const buttons = [...block.querySelectorAll('button')];
                        const results: InstagramLink[] = [];

                        for (const btn of buttons) {
                            const spans = btn.querySelectorAll('span');
                            const visibleTexts = [...spans].map(s => s.textContent?.trim()).filter(Boolean);
                            const rawLinkText = visibleTexts.find(text => /\w+\.\w+/.test(text || ''));
                            const otherText = visibleTexts.filter(t => t !== rawLinkText).join(' ').trim();

                            if (!rawLinkText) continue;

                            results.push({
                                url: `https://${rawLinkText}`,
                                title: otherText || rawLinkText,
                            });
                        }

                        resolve(results as InstagramLink[]);
                    });
                },
            });
            const links = injectionResult?.result ?? [];

            for (const link of links) {
                allLinks.push(link.url);
                results.push({ instagram_username: username, ...link });
            }
        } catch (err: any) {
            postStatus(`   ❌ Failed to scrape @${username}: ${err.message}`);
            errors.push({ instagram_username: username, error: err.message });
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