import { ICalCalendar, ICalEventData } from "ical-generator";
import { Event } from "../commonTypes.js";

type CalendarType = "calendar" | "wishlist";

const CALENDAR_TITLES = {
  calendar: "PlayBuddy Event (All)s",
  wishlist: "PlayBuddy Wishlist",
};

export const createIcal = (events: Event[], type: CalendarType = 'calendar') => {
  // Create a new iCalendar
  const calendar: ICalCalendar = new ICalCalendar({
    name: CALENDAR_TITLES[type]
  });

  // Convert JSON data to iCalendar events
  events.forEach((event: Event) => {
    const start_date = new Date(event.start_date);
    const end_date = new Date(event.end_date);
    // check if start and end dates are valid
    const isValidDate = (date: Date) => {
      return date instanceof Date && !isNaN(date.getTime());
    };

    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      return;
    }

    const icalEvent: ICalEventData = {
      start: start_date,
      end: end_date,
      summary: event.name,
      description: `${event.event_url} ${event.description}`,
      location: event.location,
      x: [{
        key: 'X-Organizer-ID',
        value: event.organizer.id.toString(),
      }, {
        key: 'X-Organizer-Name',
        value: event.organizer.name.toString(),
      }]
    };
    calendar.createEvent(icalEvent);
  });

  const calString = calendar.toString();

  return calString;
};
