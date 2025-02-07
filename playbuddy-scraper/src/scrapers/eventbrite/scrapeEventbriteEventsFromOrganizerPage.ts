import axios from "axios";
import TurndownService from 'turndown';

import { ScraperParams } from "../types.js";
import { CreateEventInput, SourceMetadata } from "../../commonTypes.js";

import { EventbriteEvent } from "./types.js";

const filterByRegion = (event: EventbriteEvent, region: string) => {
  return event.venue?.address?.region === region;
}

const mapEventbriteEventToEvent = (eventbriteEvents: EventbriteEvent[], sourceMetadata: SourceMetadata): CreateEventInput[] => {
  const turndownService = new TurndownService();

  const nyEvents = eventbriteEvents.filter(event => filterByRegion(event, 'NY'));

  return nyEvents.map((event): CreateEventInput => {
    const start_date = event.start.utc;
    const end_date = event.end.utc;

    const summaryMarkdown = turndownService.turndown(event.description.html);

    return {
      type: 'event',
      recurring: 'none',
      original_id: `eventbrite-${event.id}`,
      organizer: {
        id: event.organizer.id,
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

      location: event.venue?.address?.localized_address_display,
      price: event.ticket_availability?.minimum_ticket_price?.display,

      description: summaryMarkdown,
      tags: event.category ? [event.category.name] : [], // Using category as a tag since tags are not present in the new structure

      source_ticketing_platform: "Eventbrite",
      ...sourceMetadata,
      communities: sourceMetadata.communities || []
    };
  });
}

// Gets the events from the /showmore/ endpoint
const scrapeEventbriteEventsFromOrganizerPage = async ({
  url,
  sourceMetadata,
}: ScraperParams): Promise<CreateEventInput[]> => {
  try {
    // Extract organizer ID from the URL
    const organizerId = url.split('/').pop()?.split('-').pop();

    if (!organizerId) {
      console.error(`Failed to extract organizer ID from URL: ${url}`);
      return [];
    }

    // Construct the endpoint URL
    const endpointUrl = `https://www.eventbrite.com/org/${organizerId}/showmore/?page_size=1000&type=future&page=1`;

    // Fetch data from the endpoint
    const response = await axios.get(endpointUrl);

    if (response.status !== 200) {
      console.error(`Failed to fetch data from endpoint: ${endpointUrl}`);
      return [];
    }

    return mapEventbriteEventToEvent(response.data.data.events, sourceMetadata);
  } catch (error) {
    console.error(`Error scraping Eventbrite events from organizer page`, error);
    return [];
  }
};


// MAIN FUNCTION
export const scrapeEventbriteEventsFromOrganizersURLs = async ({
  organizerURLs,
  sourceMetadata,
}: {
  organizerURLs: string[];
  sourceMetadata: SourceMetadata;
}): Promise<CreateEventInput[]> => {
  const events = [];

  for (const organizerURL of organizerURLs) {
    const organizerEvents = await scrapeEventbriteEventsFromOrganizerPage({
      url: organizerURL,
      sourceMetadata,
    });
    events.push(...organizerEvents);
  }

  return events;
};

// Default export function
export default scrapeEventbriteEventsFromOrganizerPage;
