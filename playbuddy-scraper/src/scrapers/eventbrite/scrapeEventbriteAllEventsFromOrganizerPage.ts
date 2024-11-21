import axios from "axios";

import cheerio from "cheerio";
import scrapeEventbriteEventsFromOrganizerPage from "./scrapeEventbriteEventsFromOrganizerPage.js";
import { CreateEventInput } from "../../commonTypes.js";
import { ScraperParams } from "../types.js";

const extractParamsFromUrl = (url: string) => {
  // Create a URL object
  const params = new URL(url).searchParams;

  // Extract the values
  const urlValue = params.get('url');
  const referringTicketKey = params.get('referring_ticket_key');
}

const scrapeEventbriteAllEventsFromEventPage = async ({
  url,
  sourceMetadata,
}: ScraperParams): Promise<CreateEventInput[] | null> => {
  try {
    'https://api.lu.ma/url?url=legeyh1e&referring_ticket_key=miJO9Z'
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const organizerUrl =
      $('[data-testid="organizer-name"] a').attr("href") || "";

    if (!organizerUrl) {
      console.log("No organizer URL found for ", sourceMetadata.source_url);
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

    // @ts-ignore
    if (error?.response?.status === 404) {
      console.log(`Eventbrite event not found: ${sourceMetadata.source_url}`);
      return [];
    }

    console.error(
      `Error scraping Eventbrite organizer from event page ${sourceMetadata.source_url}:`,
      error,
    );
    throw new Error("Error scraping Eventbrite organizer from event page");
  }
};

export default scrapeEventbriteAllEventsFromEventPage;
