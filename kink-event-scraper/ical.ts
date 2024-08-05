import { ICalCalendar, ICalEventData } from 'ical-generator';
import * as fs from 'fs';
import { Event } from './types';

export const createIcal = (events: Event[]) => {
    const allEvents = fs.readFileSync('../src/EventCalendar/all_events.json', 'utf-8');

    // Example JSON data
    const jsonData: Event[] = JSON.parse(allEvents);

    // Create a new iCalendar
    const calendar: ICalCalendar = new ICalCalendar({ name: 'KinkBuddy Events Calendar' });

    // Convert JSON data to iCalendar events
    jsonData.forEach((event: Event) => {
        const icalEvent: ICalEventData = {
            start: new Date(`${event.start_date}T${event.start_time}`),
            end: new Date(`${event.end_date}T${event.end_time}`),
            summary: event.name,
            description: `${event.eventUrl} ${event.summary}`,
            location: event.location
        };
        calendar.createEvent(icalEvent);
    });

    const calString = calendar.toString();

    fs.writeFileSync('../public/calendar.ics', calString)
}