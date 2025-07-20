import * as ticketTailor from './providers/ticketTailor';
import * as linktree from './providers/linkTree';
import type { EventResult, InstagramLink } from './types';
import { postStatus } from './utils';

export const ticketSiteScraperMapper: Record<string, (urls: string[]) => Promise<any>> = {
    'buytickets.at': ticketTailor.scrapeEvents,
    'tickettailor.com': ticketTailor.scrapeEvents,
    'linktr.ee': linktree.scrapeLinktree,
};

export const scrapeTicketSite = async (urls: InstagramLink[]): Promise<EventResult[]> => {
    const events: EventResult[] = [];
    for (const link of urls) {
        const site = link.url.split('/')[2];
        const scraper = ticketSiteScraperMapper[site];
        if (!scraper) {
            continue;
        }

        postStatus(`   ✔️ ${link.url}`);

        const result = await scraper([link.url]);

        const mappedResult = result.map((event: EventResult) => {
            event.instagram_handle = link.handle;
            return event;
        })

        console.log(`Scraped ${result.length} events from ${link.url}`)
        events.push(...mappedResult);
    }

    return events;
};