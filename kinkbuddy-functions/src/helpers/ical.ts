import { ICalCalendar, ICalEventData } from "ical-generator";
import { Event } from "../commonTypes.js";

export const createIcal = (events: Event[]) => {
  // Create a new iCalendar
  const calendar: ICalCalendar = new ICalCalendar({
    name: "KinkBuddy Events Calendar",
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
    };
    calendar.createEvent(icalEvent);
  });

  const calString = calendar.toString();

  return calString;
};
