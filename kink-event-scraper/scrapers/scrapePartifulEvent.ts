import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import moment from 'moment';

import { Event, SourceMetadata } from '../types';

/**
 * Converts a date and time string into ISO 8601 format with an optional end time.
 * @param {Object} params - The input parameters.
 * @param {string} params.startDate - The starting date in ISO format.
 * @param {string} params.timeString - The human-readable time string.
 * @returns {Object} - An object containing start_date and end_date in ISO format.
 */
const convertDateTime = ({
  startDate,
  timeString,
}: {
  startDate: string;
  timeString: string;
}) => {
  // Regex to capture start and optional end times
  const timeRegex =
    /(\d{1,2}:\d{2}(?:am|pm))(?:\s*–\s*(\d{1,2}:\d{2}(?:am|pm)))?/;
  const timeMatch = timeString.match(timeRegex);

  if (!timeMatch) {
    throw new Error('Invalid time string format');
  }

  const startTimeMatch = timeMatch[1];
  let endTimeMatch = timeMatch[2];

  // Parse the initial date
  const initialDate = moment(startDate);

  // Parse the start time and set it on the initial date
  const startDateTime = initialDate.clone().set({
    hour: moment(startTimeMatch, ['h:mma']).hour(),
    minute: moment(startTimeMatch, ['h:mma']).minute(),
    second: 0,
    millisecond: 0,
  });

  // By default, add 2 hours to the start time to get the end time
  let endDateTime: moment.Moment = startDateTime.clone().add(2, 'hours');

  // If an end time is provided, use it to set the endDateTime
  if (endTimeMatch) {
    endDateTime = initialDate.clone().set({
      hour: moment(endTimeMatch, ['h:mma']).hour(),
      minute: moment(endTimeMatch, ['h:mma']).minute(),
      second: 0,
      millisecond: 0,
    });
  }

  // Check if the end time is earlier than the start time and move to the next day if necessary
  if (endDateTime.isBefore(startDateTime)) {
    endDateTime.add(1, 'days');
  }

  // Return the formatted start and end dates in ISO format
  return {
    start_date: startDateTime.toISOString(),
    end_date: endDateTime.toISOString(),
  };
};

async function scrapePartifulEvent(
  eventId: string,
  sourceMetadata: SourceMetadata,
): Promise<Event[] | null> {
  const url = `https://partiful.com/e/${eventId}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract event details
    const name = $('h1 span.summary').first().text();
    const startDate = $('time').attr('datetime') || '';
    const timeString = $('time div div div:nth-child(2)').text() || '';
    const { start_date, end_date } = convertDateTime({ startDate, timeString });

    if (!start_date) {
      return null;
    }

    const location = $('.icon-location-with-lock + span').text().trim();
    const priceText = $('.icon-ticket').next().text().trim();
    const priceMatch = priceText.match(/\$\d+(\.\d+)?/);
    const price = priceMatch ? priceMatch[0] : '';
    const min_ticket_price = '';
    const max_ticket_price = '';
    const imageUrl = $('section div img').attr('src') || '';
    const organizer = $('.icon-crown-fancy').next().next().text().trim();
    const organizerUrl = ''; // Currently not extracting, need to fix this
    const summary = $('div.description').text().trim();
    const tags: string[] = []; // Assuming tags are available in a specific selector, update accordingly

    const eventDetails: Event = {
      id: eventId,
      name,
      start_date,
      end_date,
      location,
      price,
      imageUrl,
      organizer,
      organizerUrl,
      eventUrl: url,
      summary,
      tags,
      min_ticket_price,
      max_ticket_price,
      source_ticketing_platform: 'Partiful',
      ...sourceMetadata,
    };

    console.log({
      sourceMetadata,
      eventDetails,
    });

    return [eventDetails];
  } catch (error) {
    console.error('Error scraping Partiful event:', error);
    return null;
  } finally {
    await browser.close();
  }
}

export default scrapePartifulEvent;
