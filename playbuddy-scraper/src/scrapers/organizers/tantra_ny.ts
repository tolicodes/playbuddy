import axios from "axios";
import { DateTime } from 'luxon';

import { NormalizedEventInput } from "../../commonTypes.js";
import { ScraperParams } from "../types.js";
import TurndownService from "turndown";

const API_URL = "https://tantrany.com/api/events-listings.json.php?user=toli";
const ORGANIZER_PAGE = "https://tantrany.com";
const VETTING_URL = "https://www.tantrany.com/desire/#apply"

interface EventDetails {
  EventId: string;
  ProductId: string;
  EventTitle: string;
  Date: string; // in YYYY-MM-DD format
  StartTime: string; // could be in 12-hour format (e.g., "8:30 pm")
  EventTag: string;
  isOnline: string; // Could be a boolean in string form like "online1" or "1"
  ImgSrc: string;
  MeetingId: string;
  LocationId: string;
  HostId: string;
  EventBriteId: string;
  URL: string; // Event URL
  LocationName: string;
  Address1: string;
  Address2: string;
  City: string;
  State: string;
  Zip: string;
  Timezone: string;
  HoursDuration: string; // Duration in hours
  RegionDisplayName: string;
  RegionName: string;
  RegionCode: string;
  RelatedRegions: string; // Comma-separated list of region codes
  ImgFile: string;
  ProductAbbr: string;
  ProductName: string;
  ColorHex: string;
  isPublic: string; // Could also be a boolean in string form like "1" or "0"
  DescShort: string | null; // Optional description
  EventDataHTMLDescription: string; // long description
  DefaultDuration: string; // Default event duration
  YearMonth: string; // in YYYY-MM format
  Day: string; // Day of the week
  Month: string; // Month name
  CDate: string; // Date of the month
  Year: string; // Year as a string, sometimes empty

}



const parseTimeWithAMPM = (date: string, time: string, timeZone = 'America/New_York') => {
  // Convert "8:30 PM" format to a valid ISO time format (HH:mm)
  const startDateTime = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd h:mm a', {
    zone: timeZone, // Default to New York time zone
  });

  // Check if the parsing was successful
  if (!startDateTime.isValid) {
    console.error('Invalid date or time format');
  }

  return startDateTime.toJSDate() || new Date();
};

// Scraper their API
export const scrapeOrganizerTantraNY = async ({
  url = API_URL,
  eventDefaults,
}: ScraperParams): Promise<NormalizedEventInput[]> => {
  try {
    // Make a request to the Eventbrite API endpoint
    const data = await axios.get(API_URL);

    // Extract relevant event details
    const events = Object.values(data.data as EventDetails[]).map((event: EventDetails): NormalizedEventInput => {
      const startDate = parseTimeWithAMPM(event.Date, event.StartTime);

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + parseFloat(event.HoursDuration || event.DefaultDuration));

      const location = `${event.LocationName} - ${event.Address1} ${event.City}, ${event.State} ${event.Zip}`;

      const turndownService = new TurndownService();

      // not sure why we have to do it twice?
      const description =
        turndownService.turndown(
          turndownService.turndown(event.EventDataHTMLDescription || '')
        );

      const vetted = [4, 11].includes(parseInt(event.ProductId));
      const play_party = event.ProductId === '4';

      return {
        ...eventDefaults,

        original_id: `organizer-tantra_ny-${event.EventId}`,
        type: 'event',
        recurring: 'none',
        organizer: {
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
        price: "",

        description,
        short_description: event.DescShort || '',

        tags: ["tantra"],
        source_ticketing_platform: "Eventbrite",
        vetted,
        vetting_url: vetted ? VETTING_URL : '',
        play_party,
      };
    });


    return events;
  } catch (error) {
    console.error(error);
    // Fail silently by returning an empty array
    return [];
  }
};
