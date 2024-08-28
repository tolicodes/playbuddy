import puppeteer from "puppeteer";
import axios from "axios";
import TurndownService from 'turndown';

import { ScraperParams } from "../types.js";
import { Event, SourceMetadata } from "../../commonTypes.js";
import { puppeteerConfig } from "../../config.js";

import { localDateTimeToISOString } from "../../helpers/partifulDateUtils.js";
import { EVENTBRITE_EVENTS_API } from "../../env.js";

// Function to scrape event details
const scrapeEventDetails = async ({
  url: apiUrl,
  sourceMetadata,
  urlCache,
}: ScraperParams): Promise<Event[]> => {
  try {
    // Make a request to the Eventbrite API endpoint
    const response = await axios.get(apiUrl);
    const data = response.data;

    // Extract relevant event details
    const events = data.events.map((event: any): Event => {
      const start_date = localDateTimeToISOString(
        event.start_date,
        event.start_time,
      );
      const end_date = localDateTimeToISOString(event.end_date, event.end_time);

      const turndownService = new TurndownService();
      const summaryMarkdown = turndownService.turndown(event.summary);

      return {
        // actually assigned by the DB, need to fill it in
        id: `eventbrite-${event.id}`,
        original_id: `eventbrite-${event.id}`,
        organizer: {
          name: event.primary_organizer.name,
          url: event.primary_organizer.url,
          original_id: `eventbrite-${event.primary_organizer.id}`,
        },
        name: event.name,
        start_date,
        end_date,
        ticket_url: event.url,
        image_url: event.image.url,
        event_url: event.url,

        location: event.primary_venue?.address.localized_address_display,
        price: event.ticket_availability.minimum_ticket_price.display,

        description: summaryMarkdown,
        tags: event.tags.map((tag: any) => tag.display_name),

        source_ticketing_platform: "Eventbrite",
        ...sourceMetadata,
      };
    });

    return events;
  } catch (error) {
    console.log(`Error scraping Eventbrite events`, error);
    // Fail silently by returning an empty array
    return [];
  }
};

// Function to scrape organizer page
// We don't use URL cache here because it doesn't cost us anything to overwrite
const scrapeEventbriteEventsFromOrganizerPage = async ({
  url,
  sourceMetadata,
}: ScraperParams): Promise<Event[]> => {
  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage();

  try {
    // keeps track of the timeout for request (below)
    let timeout: NodeJS.Timeout;

    // Listen for the API request
    const apiPromise = new Promise<string>((resolve, reject) => {
      page.on("request", (request) => {
        const url = request.url();
        if (
          url.includes(EVENTBRITE_EVENTS_API)
        ) {
          timeout && clearTimeout(timeout);
          resolve(url);
        }
      });
    });

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      timeout = setTimeout(() => {
        console.log(`Organizer URL ${url} contains no events`);
        resolve("");
      }, 10000);
    });

    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for the API request URL or timeout
    const apiUrl = await Promise.race([apiPromise, timeoutPromise]);
    if (!apiUrl) {
      return [];
    }
    console.log("Captured API URL:", apiUrl, `for organizer URL: ${url}`);

    // Scrape event details using the captured API URL
    const events = await scrapeEventDetails({ url: apiUrl, sourceMetadata });
    return events;
  } catch (error) {
    console.error(`Error scraping Eventbrite events from organizer page`, error);
    // Fail silently by returning an empty array
    return [];
  } finally {
    await browser.close();
  }
};

export const scrapeEventbriteEventsFromOrganizersURLs = async ({
  organizerURLs,
  sourceMetadata,
  urlCache,
}: {
  organizerURLs: string[];
  sourceMetadata: SourceMetadata;
  urlCache: string[];
}): Promise<Event[]> => {
  const events = [];

  for (const organizerURL of organizerURLs) {
    const organizerEvents = await scrapeEventbriteEventsFromOrganizerPage({
      url: organizerURL,
      sourceMetadata,
      urlCache,
    });
    events.push(...organizerEvents);
  }

  console.log('events', events);

  return events;
};

// Default export function
export default scrapeEventbriteEventsFromOrganizerPage;
