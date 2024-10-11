import axios from "axios";

import cheerio from "cheerio";
import scrapeEventbriteEventsFromOrganizerPage from "./scrapeEventbriteEventsFromOrganizerPage.js";
import { Event } from "../../commonTypes.js";
import { ScraperParams } from "../types.js";

const scrapeEventbriteAllEventsFromOrganizerPage = async ({
  url,
  sourceMetadata,
  urlCache,
}: ScraperParams): Promise<Event[] | null> => {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const organizerUrl =
      $('[data-testid="organizer-name"] a').attr("href") || "";

    if (!organizerUrl) {
      console.error("No organizer URL found");
      return null;
    }

    const events = await scrapeEventbriteEventsFromOrganizerPage({
      url: organizerUrl,
      sourceMetadata,
    });

    const eventsWithMetadata = events.map((event) => ({
      ...event,
      ...sourceMetadata,
    }));

    return eventsWithMetadata;
  } catch (error) {
    console.error(
      `Error scraping Eventbrite organizer from event page ${sourceMetadata.source_url}:`,
      error,
    );
    throw new Error("Error scraping Eventbrite organizer from event page");
  }
};

export default scrapeEventbriteAllEventsFromOrganizerPage;
