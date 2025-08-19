import { sleep, openTab, postStatus } from '../utils.js';
import type { EventResult } from '../types.js';



export async function scrapePluraEvents(): Promise<EventResult[]> {
    const results: EventResult[] = [];
    const errors: any[] = [];

    const DASHBOARD_URL = 'https://plra.io/manage';

    postStatus(`📅 Visiting Plura dashboard...`);
    const dashboardTab = await openTab(DASHBOARD_URL);
    await sleep(4000); // wait for page to load

    // Step 1: Extract all event links
    const [{ result: eventUrls } = { result: [] }] = await chrome.scripting.executeScript({
        target: { tabId: dashboardTab.id! },
        func: () => {
            const links: string[] = Array.from(document.querySelectorAll('a[href^="/manage/event/"]'))
                .map((a) => new URL((a as HTMLAnchorElement).href, location.origin).toString());

            const baseUrls: string[] = links
                .map((url) => {
                    const match = url.match(/^https:\/\/plra\.io\/manage\/event\/([a-f0-9-]{36})/);
                    return match ? `https://plra.io/manage/event/${match[1]}/tickets` : null;
                })
                .filter((url): url is string => url !== null)
                .filter((url, index, self) => self.indexOf(url) === index); // dedupe

            console.log('✅ Base event URLs:', baseUrls);
            return baseUrls;
        },
    });


    postStatus(`🔗 Found ${eventUrls?.length || 0} event(s)`);

    for (const eventUrl of eventUrls || []) {
        try {
            postStatus(`🕵️ Scraping: ${eventUrl}`);
            const tab = await openTab(eventUrl);
            await sleep(1000);

            // Step 2: Inject scraping code
            const [injectionResult] = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                func: () => {
                    return (() => {
                        type Ticket = {
                            title: string;
                            price: number;
                            sold: number;
                            revenue: number;
                            status: string;
                        };

                        type PromoCode = {
                            code: string;
                            description: string;
                            used: number | null;
                            max: number | null;
                            remaining: number | null;
                        };

                        type PluraEventData = {
                            name: string;
                            date: string;
                            tickets: Ticket[];
                            promoCodes: PromoCode[];
                        };

                        const header = document.querySelector('h1');
                        const name = (header?.children[0] as HTMLElement)?.textContent?.trim() || '';
                        const date = (header?.children[1] as HTMLElement)?.textContent?.trim() || '';

                        const allH1s = Array.from(document.querySelectorAll('h1'));
                        const ticketsHeader = allH1s.find(el => el.textContent?.trim().toLowerCase() === 'tickets');
                        const ticketsSection = ticketsHeader?.nextElementSibling as HTMLElement | null;
                        const ticketBlocks = ticketsSection?.querySelectorAll('section') ?? [];

                        const tickets: Ticket[] = Array.from(ticketBlocks).map(section => {
                            const title = section.querySelector('h1')?.textContent?.trim() || '';

                            const priceText = section.querySelector('p[title="Ticket price"]')?.textContent?.trim() || '$0';
                            const price = parseFloat(priceText.replace('$', ''));

                            const soldMatch = section.innerHTML.match(/<strong>(\d+)<\/strong>\s*sold/i);
                            const sold = soldMatch ? parseInt(soldMatch[1], 10) : 0;

                            const revenueMatch = section.innerHTML.match(/\$([\d,]+(?:\.\d+)?)\s*collected/i);
                            const revenue = revenueMatch ? parseFloat(revenueMatch[1].replace(/,/g, '')) : 0;

                            const children = Array.from(section.children);
                            const lastDiv = children[children.length - 1];
                            const status = lastDiv?.textContent?.trim() || '';

                            return { title, price, sold, revenue, status };
                        });

                        const promoRows = document.querySelectorAll('table tr');
                        const promoCodes: PromoCode[] = Array.from(promoRows).map(row => {
                            const span = row.querySelector('td span');
                            const code = span?.textContent?.trim();
                            const description = span?.nextSibling?.textContent?.trim();
                            const usageText = row.querySelectorAll('td')[1]?.textContent?.trim();

                            if (!code || !description || !usageText) return null;

                            const match = usageText.match(/(\d+)\s*\/\s*(\d+)/);
                            const used = match ? parseInt(match[1], 10) : null;
                            const max = match ? parseInt(match[2], 10) : null;

                            return {
                                code,
                                description,
                                used,
                                max,
                                remaining: max != null && used != null ? max - used : null,
                            };
                        }).filter((x): x is PromoCode => x !== null);

                        const result: PluraEventData = {
                            name,
                            date,
                            tickets,
                            promoCodes,
                        };

                        return result;
                    })();
                },
            });

            if (injectionResult?.result) {
                results.push(injectionResult.result as EventResult);
            } else {
                throw new Error('No data returned from script');
            }
        } catch (err: any) {
            postStatus(`   ❌ Failed to scrape ${eventUrl}: ${err.message}`);
            errors.push({ eventUrl, error: err.message });
        }
    }

    console.log('errors', errors)

    return results;
}
