import scrapePartifulEvent from "../scrapers/scrapePartifulEvent.js";
import scrapeEventbriteAllOrganizerEventsFromEventPage from "../scrapers/eventbrite/scrapeEventbriteAllOrganizerEventsFromEventPage.js";
const SCRAPERS = {
    "partiful.com": {
        scraper: scrapePartifulEvent,
        eventRegex: /partiful\.com\/e\/([^\/?#]+)/,
        eventRegexIndex: 1,
    },
    "eventbrite.com": {
        scraper: scrapeEventbriteAllOrganizerEventsFromEventPage,
        eventRegex: /.*/,
        eventRegexIndex: 0,
    },
};
const timeout = (ms) => new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Timeout")), ms);
});
const dedupeByLink = (arr) => {
    const seen = new Set();
    return arr.filter((item) => {
        const duplicate = seen.has(item.url);
        seen.add(item.url);
        return !duplicate;
    });
};
export const scrapeURLs = async (links, urlCache) => {
    const events = [];
    const filteredFromCache = links.filter((link) => {
        if (!link.url)
            return false;
        return !urlCache.includes(link.url);
    });
    const dupes = links.filter((link) => {
        if (!link.url)
            return false;
        return urlCache.includes(link.url);
    });
    const dedupedLinks = dedupeByLink(filteredFromCache);
    for (let i = 0; i < dedupedLinks.length; i++) {
        const sourceMetadata = dedupedLinks[i];
        const url = sourceMetadata.url;
        if (!url)
            continue;
        console.log(`[${i}/${dedupedLinks.length}] Processing URL: ${url}`);
        const domain = new URL(url).hostname.replace("www.", "");
        const scraperConfig = SCRAPERS[domain];
        if (!scraperConfig) {
            console.error(`No scraper available for domain: ${domain}`);
            continue;
        }
        const { scraper, eventRegex, eventRegexIndex } = scraperConfig;
        const match = url.match(eventRegex);
        if (match && match[eventRegexIndex]) {
            const eventId = match[eventRegexIndex];
            console.log(`Scraping ${domain} URL: ${url} with event ID: ${eventId}`);
            try {
                const eventsScraped = await Promise.race([
                    scraper({
                        url: eventId,
                        sourceMetadata,
                        urlCache,
                    }),
                    timeout(15000),
                ]);
                if (eventsScraped) {
                    events.push(...eventsScraped);
                }
            }
            catch (error) {
                if (error?.message === "Timeout") {
                    console.warn(`Scraping ${url} timed out.`);
                }
                else {
                    console.error(`Error scraping ${url}:`, error);
                }
            }
        }
        else {
            console.error(`No event ID found for URL: ${url}`);
        }
    }
    console.log(`Scraped ${events.length} events`);
    return events;
};
export default scrapeURLs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlVVJMcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oZWxwZXJzL3NjcmFwZVVSTHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxtQkFBbUIsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLCtDQUErQyxNQUFNLDJFQUEyRSxDQUFDO0FBVXhJLE1BQU0sUUFBUSxHQUFtQjtJQUMvQixjQUFjLEVBQUU7UUFDZCxPQUFPLEVBQUUsbUJBQW1CO1FBQzVCLFVBQVUsRUFBRSw4QkFBOEI7UUFDMUMsZUFBZSxFQUFFLENBQUM7S0FDbkI7SUFDRCxnQkFBZ0IsRUFBRTtRQUNoQixPQUFPLEVBQUUsK0NBQStDO1FBQ3hELFVBQVUsRUFBRSxJQUFJO1FBQ2hCLGVBQWUsRUFBRSxDQUFDO0tBQ25CO0NBQ0YsQ0FBQztBQUdGLE1BQU0sT0FBTyxHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FDN0IsSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7SUFDOUIsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDO0FBRUwsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFxQixFQUFvQixFQUFFO0lBQy9ELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztB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