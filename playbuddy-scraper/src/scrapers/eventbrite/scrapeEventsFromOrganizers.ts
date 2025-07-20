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
  console.log('FILTER: NY Events: ', eventbriteEvents.length, 'to', nyEvents.length);

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

const scrapeOrganizerPage = async ({
  url,
  eventDefaults,
}: ScraperParams): Promise<NormalizedEventInput[]> => {
  const separator = '-'.repeat(process.stdout.columns);
  console.log('\n' + separator);
  console.log(`SCRAPE ORGANIZER: [${url}]`);
  console.log(separator + '\n');

  const allEvents: NormalizedEventInput[] = [];

  try {
    const organizerId = url.split('/').pop()?.split('-').pop();
    if (!organizerId) {
      console.error(`SCRAPE ORGANIZER: Could not extract organizer ID from URL: ${url}`);
      return [];
    }

    let page = 1;
    const pageSize = 50;

    const apiUrl = `https://www.eventbrite.com/api/v3/organizers/${organizerId}/events/?expand=ticket_availability,organizer&status=live&only_public=true`

    // old endpoint
    // const endpointUrl = `https://www.eventbrite.com/org/${organizerId}/showmore/?page_size=1000&type=future&page=${page}`;

    console.log(`Fetching API page ${page}: ${apiUrl}`);

    const response = await axios.get(apiUrl);

    const rawEvents = response.data.events;
    if (!rawEvents || rawEvents.length === 0) {
      console.log(`No more events found on page ${page}.`);
    }

    const filteredEvents = rawEvents.filter((event: EventbriteEvent) => !event.is_series_parent);

    const events = mapEventbriteEventToEvent(filteredEvents, eventDefaults);
    for (const event of events) {
      console.log(`Scraping description for: ${event.name}`);
      event.description = await scrapeDescriptionFromEventPage(event.event_url!);
      await waitBetweenRequests();
    }

    allEvents.push(...events);
    // if (!response.data.pagination?.has_more_items) break;
  } catch (error) {
    console.error(`Error scraping Eventbrite API`, error);
  }

  return allEvents;
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
