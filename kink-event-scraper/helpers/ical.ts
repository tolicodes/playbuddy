import { ICalCalendar, ICalEventData } from 'ical-generator';
import * as fs from 'fs';
import { Event } from '../types';

export const createIcal = (events: Event[]) => {
    const allEvents = fs.readFileSync(
        '../src/EventCalendar/all_events.json',
        'utf-8',
    );

    // Example JSON data
    const jsonData: Event[] = JSON.parse(allEvents);

    // Create a new iCalendar
    const calendar: ICalCalendar = new ICalCalendar({
        name: 'KinkBuddy Events Calendar',
    });

    // Convert JSON data to iCalendar events
    jsonData.forEach((event: Event) => {
        const start = new Date(`${event.start_date}${event.start_time ? ` ${event.start_time} UTC` : ''}`);
        const end = new Date(`${event.end_date}${event.end_time ? ` ${event.end_time} UTC` : ''}`);

        // check if start and end dates are valid
        const isValidDate = (date: Date) => {
            return date instanceof Date && !isNaN(date.getTime());
        };

        if (!isValidDate(start) || !isValidDate(end)) {
            return;
        }

        const icalEvent: ICalEventData = {
            start,
            end,
            summary: event.name,
            description: `${event.eventUrl} ${event.summary}`,
            location: event.location,
        };
        calendar.createEvent(icalEvent);
    });

    const calString = calendar.toString();

    fs.writeFileSync('../public/calendar.ics', calString);
};
