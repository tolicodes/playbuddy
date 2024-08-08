import axios from 'axios';

import cheerio from 'cheerio';
import scrapeEventbriteEventsFromOrganizerPage from './scrapeEventbriteEventsFromOrganizerPage';
import { Event, SourceMetadata } from '../../types';

const scrapeEventbriteAllOrganizerEventsFromEventPage = async (
  eventId: string,
  sourceMetadata: SourceMetadata,
): Promise<Event[] | null> => {
  try {
    const { data } = await axios.get(sourceMetadata.url);
    const $ = cheerio.load(data);

    const organizerUrl =
      $('[data-testid="organizer-name"] a').attr('href') || '';

    if (!organizerUrl) {
      console.log('No organizer URL found');
      return null;
    }

    const events = await scrapeEventbriteEventsFromOrganizerPage(
      organizerUrl,
      sourceMetadata,
    );

    const eventsWithMetadata = events.map((event) => ({
      ...event,
      ...sourceMetadata,
    }));

    return eventsWithMetadata;
  } catch (error) {
    console.error(
      `Error scraping Eventbrite organizer from event page ${sourceMetadata.url}:`,
      error,
    );
    throw new Error('Error scraping Eventbrite organizer from event page');
  }
};

export default scrapeEventbriteAllOrganizerEventsFromEventPage;
