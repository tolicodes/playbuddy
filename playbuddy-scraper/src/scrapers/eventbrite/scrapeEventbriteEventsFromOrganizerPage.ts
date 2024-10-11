import axios from "axios";
import TurndownService from 'turndown';

import { ScraperParams } from "../types.js";
import { Event, SourceMetadata } from "../../commonTypes.js";

import { EventbriteEvent } from "./types.js";


const mapEventbriteEventToEvent = (eventbriteEvents: EventbriteEvent[], sourceMetadata: SourceMetadata): Event[] => {
  const turndownService = new TurndownService();

  return eventbriteEvents.map((event): Event => {
    const start_date = event.start.utc;
    const end_date = event.end.utc;

    const summaryMarkdown = turndownService.turndown(event.description.html);

    return {
      id: `eventbrite-${event.id}`,
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
    };
  });
}

// Gets the events from the /showmore/ endpoint
const scrapeEventbriteEventsFromOrganizerPage = async ({
  url,
  sourceMetadata,
}: ScraperParams): Promise<Event[]> => {
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

  return events;
};

// Default export function
export default scrapeEventbriteEventsFromOrganizerPage;
