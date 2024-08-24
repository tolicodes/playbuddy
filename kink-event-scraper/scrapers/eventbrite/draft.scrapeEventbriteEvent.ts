import axios from 'axios';
import cheerio from 'cheerio';

import { parse, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import { Event } from '../../types';

interface ParsedDateTime {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

const parseDateTimeString = (dateTimeString: string): ParsedDateTime => {
  // Split the string based on the described method
  const [day, rest] = dateTimeString.split(', ');
  const [date, timePart] = rest.split(' · ');
  const [timeRange, tz] = timePart.split(' ');

  // Extracting start and end times
  const [startTime, endTime] = timeRange.split(' - ');

  // Create a helper function to parse and format the date-time strings
  const parseEventDateTime = (
    date: string,
    time: string,
    period: string,
    timezone: string,
  ) => {
    const dateTimeString = `${date} ${time} ${period}`;
    const parsedDate = parse(dateTimeString, 'MMMM d h:mma', new Date());
    const utcDate = fromZonedTime(parsedDate, timezone);
    return toZonedTime(utcDate, timezone);
  };

  // Determine AM/PM for start and end times
  const endTimePeriod = endTime.slice(-2).toLowerCase(); // Last two characters (am/pm) of end time
  const startTimePeriod =
    startTime.includes('pm') ||
      (endTimePeriod === 'pm' && !startTime.includes('am'))
      ? 'pm'
      : 'am';

  // Remove any trailing AM/PM from the times
  const cleanedStartTime = startTime.replace(/(am|pm)/i, '');
  const cleanedEndTime = endTime.replace(/(am|pm)/i, '');

  // Parse start and end times
  const startDateTime = parseEventDateTime(
    date,
    cleanedStartTime,
    startTimePeriod,
    tz,
  );
  const endDateTime = parseEventDateTime(
    date,
    cleanedEndTime,
    endTimePeriod,
    tz,
  );

  // Formatting the dates and times
  const start_date = format(startDateTime, 'yyyy-MM-dd');
  const end_date = format(endDateTime, 'yyyy-MM-dd');
  const start_time = format(startDateTime, 'HH:mm:ss');
  const end_time = format(endDateTime, 'HH:mm:ss');
  const timezone = tz;

  return { start_date, end_date, start_time, end_time, timezone };
};

const scrapeEventbritePage = async (
  eventId: string,
): Promise<Event[] | null> => {
  const url = `https://www.eventbrite.com/e/${eventId}`;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const eventName = $('h1').text().trim();
    const dateTimeString = $('.date-info__full-datetime').text().trim() || '';

    const { start_date, end_date, start_time, end_time, timezone } =
      parseDateTimeString(dateTimeString);

    const location =
      $('.location-info__address')
        .first()
        .text()
        .replace('Show Map', '')
        .trim() || '';

    const price = $('meta[property="event:price"]').attr('content') || '';
    const imageUrl = $('meta[property="og:image"]').attr('content') || '';
    const organizer = $('.organizer-name').text().trim();
    const organizerUrl = $('.organizer-name a').attr('href') || '';
    const eventUrl = url;
    const summary = $('meta[property="og:description"]').attr('content') || '';
    const tags = $('meta[property="event:tag"]')
      .map((_, el) => $(el).attr('content'))
      .get();
    const minTicketPrice =
      $('meta[property="event:minTicketPrice"]').attr('content') || '';
    const maxTicketPrice =
      $('meta[property="event:maxTicketPrice"]').attr('content') || '';

    const event: Event = {
      id: eventId,
      name: eventName,
      start_date,
      end_date,
      start_time,
      end_time,
      timezone,
      location,
      price,
      imageUrl: imageUrl,
      organizer: organizer,
      organizerUrl: organizerUrl,
      eventUrl: eventUrl,
      summary: summary,
      tags: tags,
      min_ticket_price: minTicketPrice,
      max_ticket_price: maxTicketPrice,
      source: 'Eventbrite',
    };

    return [event];
  } catch (error) {
    console.error(
      `Error scraping Eventbrite page for event ID ${eventId}:`,
      error,
    );
    return null;
  }
};

export default scrapeEventbritePage;

// scrapeEventbritePage('923803530227')
