import axios from 'axios';
import { Event, SourceMetadata } from '../types';
import { fillInEndTime } from '../helpers/dateUtils';

const apiUrl = 'https://api.joinbloom.community/events?perPage=10000';

// We skip the params because it's self contained to the site in one json
export const scrapePluraEvents = async ({
  sourceMetadata
}: {
  sourceMetadata: SourceMetadata
}): Promise<Event[]> => {
  const response = await axios.get(apiUrl);
  const data = response.data;

  const events: Event[] = data.hangouts
    .filter((event: any) => event.location?.city === 'New York')
    .map((event: any) => {
      return {
        id: event.id,
        name: event.eventName,
        start_date: event.eventStartsAt,
        end_date: fillInEndTime(event.eventStartsAt, event.eventEndsAt),
        timezone: 'America/New_York',
        location:
          `${event.location.address1 || ''} ${event.location.address2 || ''}, ${event.location.city}, ${event.location.region} ${event.location.postalCode || ''}`.trim(),
        price: '', // Assuming the price can be blank
        imageUrl: event.image.urls['600x300'], // Assuming we need the 600x300 size
        organizer: event.organization?.name,
        organizerUrl: event.organization?.referral?.url,
        eventUrl: event.shareUrl,
        summary: event.details.replace(/<[^>]*>?/gm, ''), // Removing HTML tags from the summary
        tags: [],
        min_ticket_price: '', // Assuming the min ticket price can be blank
        max_ticket_price: '', // Assuming the max ticket price can be blank
        source_ticketing_platform: 'Plura',
        ...sourceMetadata
      }
    });
  return events;
};
