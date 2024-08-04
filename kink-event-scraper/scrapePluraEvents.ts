import axios from 'axios';
import { Event } from './types';

const apiUrl = 'https://api.joinbloom.community/events?perPage=10000';

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[1].substring(0, 5);
};

export const scrapePluraEvents = async (): Promise<Event[]> => {
  const response = await axios.get(apiUrl);
  const data = response.data;

  console.log(data.hangouts[0])

  const events: Event[] = data.hangouts
    .filter((event: any) => event.location?.city === 'New York')
    .map((event: any) => ({
      id: event.id,
      name: event.eventName,
      start_date: formatDate(event.eventStartsAt),
      end_date: formatDate(event.eventEndsAt),
      start_time: formatTime(event.eventStartsAt),
      end_time: formatTime(event.eventEndsAt),
      timezone: 'America/New_York',
      location: `${event.location.address1 || ''} ${event.location.address2 || ''}, ${event.location.city}, ${event.location.region} ${event.location.postalCode || ''}`.trim(),
      price: '', // Assuming the price can be blank
      imageUrl: event.image.urls['600x300'], // Assuming we need the 600x300 size
      organizer: event.organization?.name,
      organizerUrl: event.organization?.referral?.url,
      eventUrl: event.shareUrl,
      summary: event.details.replace(/<[^>]*>?/gm, ''), // Removing HTML tags from the summary
      tags: [],
      min_ticket_price: '', // Assuming the min ticket price can be blank
      max_ticket_price: '',  // Assuming the max ticket price can be blank
      source: 'Plura',
    }));

  console.log(events);
  return events;
};
