// import { NormalizedEventInput, EventDataSource } from "../../commonTypes.js";
// import { ScraperParams } from '../../scrapers/types.js'
// import scrapePartifulEvent from "../../scrapers/_depracated/scrapePartifulEvent.js";
// // import scrapeEventbriteAllEventsFromEventPage from "../scrapers/_depracated/scrapeEventbriteAllEventsFromOrganizerPage.js";
// // import scrapeLumaEventFromPage from "../scrapers/_depracated/luma.js";

// type ScrapersConfig = {
//     [domain: string]: {
//         scraper: (params: ScraperParams) => Promise<NormalizedEventInput[] | null>;
//         eventRegex: RegExp;
//         eventRegexIndex: number;
//     };
// };

// export const SCRAPERS: ScrapersConfig = {
//     "partiful.com": {
//         scraper: scrapePartifulEvent,
//         eventRegex: /partiful\.com\/e\/([^/?#]+)/,
//         eventRegexIndex: 1,
//     },
//     // // /This is used for whatsapp groups to scrape all events from an organizer
//     // "eventbrite.com": {
//     //     scraper: scrapeEventbriteAllEventsFromEventPage,
//     //     eventRegex: /.*/,
//     //     eventRegexIndex: 0,
//     // },
//     // "lu.ma": {
//     //     scraper: scrapeLumaEventFromPage,
//     //     eventRegex: /.*/,
//     //     eventRegexIndex: 0,
//     // },
// };

// // Timeout function that returns a promise that rejects after a specified time
// const timeout = (ms: number) =>
//     new Promise<null>((_, reject) => {
//         setTimeout(() => reject(new Error("Timeout")), ms);
//     });

// const dedupeByLink = (arr: EventDataSource[]): EventDataSource[] => {
//     const seen = new Set();
//     return arr.filter((item) => {
//         const duplicate = seen.has(item.source_url);
//         seen.add(item.source_url);
//         return !duplicate;
//     });
// };

// export const scrapeURLs = async (
//     links: EventDataSource[],
//     urlCache: string[],
// ): Promise<NormalizedEventInput[]> => {
//     const events: NormalizedEventInput[] = [];

//     const filteredFromCache = links.filter((link) => {
//         if (!link.source_url) return false;
//         return !urlCache.includes(link.source_url);
//     });

//     // Remove duplicate URLs
//     const dedupedLinks = dedupeByLink(filteredFromCache);

//     // Process each link sequentially
//     for (let i = 0; i < dedupedLinks.length; i++) {
//         const eventDataSource = dedupedLinks[i];
//         const url = eventDataSource.source_url;
//         if (!url) continue;
//         console.log(`[${i}/${dedupedLinks.length}] Processing URL: ${url}`);

//         const extractTLD = (url: string) => {
//             const domain = new URL(url).hostname.replace(/^www\./, "");
//             const parts = domain.split(".");
//             return parts.slice(-2).join("."); // Get the last two parts for the TLD
//         };

//         const domain = extractTLD(url);

//         const scraperConfig = SCRAPERS[domain];

//         if (!scraperConfig) {
//             console.error(`No scraper available for domain: ${domain}`);
//             continue;
//         }

//         const { scraper, eventRegex, eventRegexIndex } = scraperConfig;
//         const match = url.match(eventRegex);

//         if (match && match[eventRegexIndex]) {
//             const eventId = match[eventRegexIndex];
//             console.log(`Scraping ${domain} URL: ${url} with event ID: ${eventId}`);
//             try {
//                 // Set a timeout of 60 seconds (60000 milliseconds)
//                 const eventsScraped = await Promise.race([
//                     scraper({
//                         url: eventId,
//                         urlCache,
//                     }),
//                     timeout(200000),
//                 ]);

//                 const eventsScrapedWithCommunities = eventsScraped?.map((event) => {
//                     // while we scrape all the organizer's event, we only want to associate the event with the community of the original event
//                     // and not all of the other events from that organizers which we picked up
//                     const isOriginalEvent = event.ticket_url === url;

//                     return {
//                         ...event,
//                         communities: [
//                             ...event.communities || [],
//                             ...(isOriginalEvent ? event.communities || [] : []),
//                         ]
//                     };
//                 });

//                 if (eventsScrapedWithCommunities) {
//                     events.push(...eventsScrapedWithCommunities);
//                 }

//             } catch (error: any) {
//                 if (error?.message === "Timeout") {
//                     console.warn(`Scraping ${url} timed out.`);
//                 } else {
//                     console.error(`Error scraping ${url}:`, error);
//                 }
//             }
//         } else {
//             console.error(`No event ID found for URL: ${url}`);
//         }
//     }

//     console.log(`Scraped ${events.length} events`);

//     return events;
// };

// export default scrapeURLs;
