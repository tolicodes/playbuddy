import axios from "axios";

import { Event } from "../../commonTypes.js";
import { ScraperParams } from "../types.js";

const API_URL = "https://tantrany.com/api/events-listings.json.php?user=toli";
const ORGANIZER_PAGE = "https://tantrany.com";

// Scraper their API
export const scrapeOrganizerTantraNY = async ({
  url = API_URL,
  sourceMetadata,
}: ScraperParams): Promise<Event[]> => {
  try {
    // Make a request to the Eventbrite API endpoint
    const data = await axios.get(API_URL);

    // Extract relevant event details
    const events = Object.values(data.data).map((event: any): Event => {
      const startDate = new Date(`${event.Date} ${event.StartTime}`);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + parseFloat(event.HoursDuration));

      const location = `${event.LocationName} - ${event.Address1} ${event.City}, ${event.State} ${event.Zip}`;

      return {
        id: `organizer-tantra_ny-${event.EventId}`,
        organizer: {
          // actually filled in by the DB, need to fill it in for ts, fix later
          id: '',
          name: "The Tantra Institute",
          url: ORGANIZER_PAGE,
        },

        name: event.ProductName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),

        ticket_url: event.URL,
        event_url: event.URL,
        image_url: event.ImgSrc,

        location,
        price: "0",

        description: event.DescShort,
        tags: ["tantra"],
        source_ticketing_platform: "Eventbrite",
        ...sourceMetadata,
      };
    });

    return events;
  } catch (error) {
    console.error(error);
    // Fail silently by returning an empty array
    return [];
  }
};
