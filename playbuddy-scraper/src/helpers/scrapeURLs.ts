import { Event, SourceMetadata } from "../commonTypes.js";
import { ScraperParams } from '../scrapers/types.js'
import scrapePartifulEvent from "../scrapers/scrapePartifulEvent.js";
import scrapeEventbriteAllOrganizerEventsFromEventPage from "../scrapers/eventbrite/scrapeEventbriteAllOrganizerEventsFromEventPage.js";

type ScrapersConfig = {
  [domain: string]: {
    scraper: (params: ScraperParams) => Promise<Event[] | null>;
    eventRegex: RegExp;
    eventRegexIndex: number;
  };
};

const SCRAPERS: ScrapersConfig = {
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

// Timeout function that returns a promise that rejects after a specified time
const timeout = (ms: number) =>
  new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error("Timeout")), ms);
  });

const dedupeByLink = (arr: SourceMetadata[]): SourceMetadata[] => {
  const seen = new Set();
  return arr.filter((item) => {
    const duplicate = seen.has(item.source_url);
    seen.add(item.source_url);
    return !duplicate;
  });
};

export const scrapeURLs = async (
  links: SourceMetadata[],
  urlCache: string[],
): Promise<Event[]> => {
  const events: Event[] = [];

  const filteredFromCache = links.filter((link) => {
    if (!link.source_url) return false;
    return !urlCache.includes(link.source_url);
  });

  const dupes = links.filter((link) => {
    if (!link.source_url) return false;
    return urlCache.includes(link.source_url);
  });

  // Remove duplicate URLs
  const dedupedLinks = dedupeByLink(filteredFromCache);

  // Process each link sequentially
  for (let i = 0; i < dedupedLinks.length; i++) {
    const sourceMetadata = dedupedLinks[i];
    const url = sourceMetadata.source_url;
    if (!url) continue;
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
        // Set a timeout of 30 seconds (30000 milliseconds)
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
      } catch (error: any) {
        if (error?.message === "Timeout") {
          console.warn(`Scraping ${url} timed out.`);
        } else {
          console.error(`Error scraping ${url}:`, error);
        }
      }
    } else {
      console.error(`No event ID found for URL: ${url}`);
    }
  }

  console.log(`Scraped ${events.length} events`);

  return events;
};

export default scrapeURLs;
