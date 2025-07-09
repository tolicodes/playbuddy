import * as ticketTailor from './providers/ticketTailor';
import type { EventResult } from './types';
import { postStatus } from './utils';

export const ticketSiteScraperMapper: Record<string, (urls: string[]) => Promise<any>> = {
    'buytickets.at': ticketTailor.scrapeEvents,
    'tickettailor.com': ticketTailor.scrapeEvents,
};

export const scrapeTicketSite = async (urls: string[]): Promise<EventResult[]> => {
    const events: EventResult[] = [];
    for (const url of urls) {
        const site = url.split('/')[2];
        const scraper = ticketSiteScraperMapper[site];
        if (!scraper) {
            continue;
        }

        postStatus(`   ✔️ ${url}`);

        const result = await scraper([url]);

        console.log(`Scraped ${result.length} events from ${url}`)
        events.push(...result);
    }

    return events;
};