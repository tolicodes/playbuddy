import axios from "axios";
import cheerio from 'cheerio';
import TurndownService from 'turndown';

import { ScraperParams } from "../types.js";
import { NormalizedEventInput } from "../../commonTypes.js";

import { EventbriteEvent } from "./types.js";



const filterByRegion = (event: EventbriteEvent, region: string) => {
  return event.venue?.address?.region === region;
}

const isRetreat = (event: EventbriteEvent) => {
  return new Date(event.end.utc).getTime() - new Date(event.start.utc).getTime() > 24 * 60 * 60 * 1000;

}

const mapEventbriteEventToEvent = (eventbriteEvents: EventbriteEvent[], eventDefaults: Partial<NormalizedEventInput>): NormalizedEventInput[] => {
  const nyEvents = eventbriteEvents.filter(event => filterByRegion(event, 'NY'));
  const nonNyEvents = eventbriteEvents.filter(event => !filterByRegion(event, 'NY'));
  console.log('FILTER: NY Events: ', eventbriteEvents.length, 'to', nyEvents.length);
  console.log('FILTER: Non NY Events: ', nonNyEvents.length);

  return eventbriteEvents.map((event) => {
    const start_date = event.start.utc;
    const end_date = event.end.utc;

    const isRetreatEvent = isRetreat(event);
    const isNonNyEvent = !filterByRegion(event, 'NY');

    return {
      ...eventDefaults,
      recurring: 'none',
      original_id: `eventbrite-${event.id}`,
      organizer: {
        name: event.organizer.name,
        url: event.organizer.url,
        original_id: `eventbrite-${event.organizer.id}`,
      },
      name: event.name.text,
      start_date,
      end_date,
      ticket_url: event.url,
      image_url: event.logo?.url,
      event_url: event.url,
      description: '',
      // This is the shorter description, we will scraper the full description later
      short_description: event.description.text,

      location: event.venue?.address?.localized_address_display,
      price: event.ticket_availability?.minimum_ticket_price?.display,

      tags: event.category ? [event.category.name] : [], // Using category as a tag since tags are not present in the new structure

      source_ticketing_platform: "Eventbrite",
      communities: eventDefaults.communities || [],

      non_ny: isNonNyEvent,
      type: isRetreatEvent ? 'retreat' : 'event',
    };
  });
}

const scrapeDescriptionFromEventPage = async (eventPageUrl: string): Promise<string> => {
  try {
    const { data } = await axios.get(eventPageUrl);
    const $ = cheerio.load(data);

    const description = $('.event-description__content--expanded').html();

    if (!description) {
      return '';
    }

    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(description);

    return markdown;
  } catch (error) {
    console.error(`SCRAPE ORGANIZER: Error scraping description from event page ${eventPageUrl}:`, error);
    return '';
  }
}

const waitBetweenRequests = () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });
};

// Gets the events from the /showmore/ endpoint
const scrapeOrganizerPage = async ({
  url,
  eventDefaults
}: ScraperParams): Promise<NormalizedEventInput[]> => {

  const separator = '-'.repeat(process.stdout.columns);

  console.log('\n' + separator);
  console.log(`SCRAPE ORGANIZER: [${url}`);
  console.log(separator + '\n');

  try {
    // Extract organizer ID from the URL
    const organizerId = url.split('/').pop()?.split('-').pop();

    if (!organizerId) {
      console.error(`SCRAPE ORGANIZER: Extract organizer ID from URL: ${url}`);
      return [];
    }

    // Construct the endpoint URL
    const endpointUrl = `https://www.eventbrite.com/org/${organizerId}/showmore/?page_size=1000&type=future&page=1`;

    // Fetch data from the endpoint
    const response = await axios.get(endpointUrl);

    if (response.status !== 200) {
      console.error(`SCRAPE ORGANIZER: Failed to fetch data from endpoint: ${endpointUrl}`);
      return [];
    }

    const events = mapEventbriteEventToEvent(response.data.data.events, eventDefaults);

    console.log(`SCRAPE ORGANIZER: Scraping ${events.length} events from organizer page: ${url}`);

    for (const event of events) {
      console.log(`SCRAPE ORGANIZER: Scraping description from event page: ${event.name}`)
      event.description = await scrapeDescriptionFromEventPage(event.event_url!);
      await waitBetweenRequests(); // Pause between scrapes
    }

    return events;
  } catch (error) {
    console.error(`SCRAPE ORGANIZER: Error scraping Eventbrite events from organizer page`, error);
    return [];
  }
};

// MAIN FUNCTION
export const scrapeEventsFromOrganizers = async ({
  organizerURLs,
  eventDefaults,
}: {
  organizerURLs: string[];
  eventDefaults: Partial<NormalizedEventInput>;
}): Promise<NormalizedEventInput[]> => {
  const events = [];

  for (const organizerURL of organizerURLs) {
    const organizerEvents = await scrapeOrganizerPage({
      url: organizerURL,
      eventDefaults,
    });
    events.push(...organizerEvents);
    await waitBetweenRequests();
  }

  return events;
};

export default scrapeEventsFromOrganizers;
