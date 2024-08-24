import axios from 'axios';

import { Event, ScraperParams, SourceMetadata } from '../../types';

const API_URL = 'https://tantrany.com/api/events-listings.json.php?user=toli';
const ORGANIZER_PAGE = 'https://tantrany.com';

// Scraper their API
export const scrapeOrganizerTantraNY = async ({
  url = API_URL,
  sourceMetadata,
}: ScraperParams): Promise<Event[]> => {
  try {
    // Make a request to the Eventbrite API endpoint
    const data = await axios.get(API_URL);

    // Extract relevant event details
    const events = data.data.map((event: any): Event => {
      const startDate = new Date(`${event.Date} ${event.StartTime}`)
      const endDate = new Date(startDate)
      endDate.setHours(endDate.getHours() + parseFloat(event.HoursDuration));

      const location = `${event.LocationName} - ${event.Address1} ${event.City}, ${event.State} ${event.Zip}`;

      return {
        id: `organizer-tantra_ny-${event.EventId}`,
        name: event.ProductName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location,
        price: '0',
        imageUrl: `${ORGANIZER_PAGE}/${event.ImgFileURL}`,
        organizer: 'Tantra NY',
        organizerUrl: ORGANIZER_PAGE,
        eventUrl: event.URL,
        summary: event.EventTitle,
        tags: ['tantra'],
        source_ticketing_platform: 'Eventbrite',
        ...sourceMetadata,
      };
    });

    return events;
  } catch (error) {
    console.error(error)
    // Fail silently by returning an empty array
    return [];
  }
}
