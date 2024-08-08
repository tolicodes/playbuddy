// import { scrapePluraEvents } from './scrapePluraEvents';
import fs from 'fs';
import { Event } from './types';
import { createIcal } from './helpers/ical';

import scrapeURLs from './helpers/scrapeURLs';
import scrapeWhatsapp from './scrapers/scrapeWhatsapp';

export const filterEvents = (events: Event[]) => {
    // these are default Plura events that we want to exclude from the calendar
    const EXCLUDE_EVENT_IDS = [
        'e7179b3b-b4f8-40df-8d87-f205b0caaeb1', // New York LGBTQ+ Community Events Calendar
        '036f8010-9910-435f-8119-2025a046f452', // NYC Kink Community Events Calendar
    ];

    console.log({
        events
    })

    const filteredEvents = events.filter(
        (event) => !EXCLUDE_EVENT_IDS.includes(event.id),
    ) as Event[];

    const dedupedEvents = filteredEvents.reduce((acc: Event[], event) => {
        const existingEvent = acc.find(
            (e) => e.name === event.name && e.start_date === event.start_date,
        );
        if (!existingEvent) {
            acc.push(event);
        }
        return acc;
    }, []);

    return dedupedEvents;
};

const main = async () => {
    // const organizers = JSON.parse(fs.readFileSync('eventbriteOrganizers.json', 'utf-8'));
    // const allEvents = [];

    // for (const organizer of organizers) {
    //     const events = await scrapeOrganizerEvents(organizer.url);
    //     allEvents.push(...events);
    // }

    // fs.writeFileSync('all_events.json', JSON.stringify(allEvents, null, 2);
    // console.log('All events data saved to all_events.json');

    // const events = await scrapePluraEvents();
    // fs.writeFileSync('all_plura_events.json', JSON.stringify(events, null, 2));

    // const whatsappLinksOut = await scrapeWhatsapp();

    // // Save the links to a JSON file
    // fs.writeFileSync(
    //     './data/whatsapp_links.json',
    //     JSON.stringify(whatsappLinksOut, null, 2),
    // );
    // console.log('Links saved to ./data/whatsapp_links.json');

    // const whatsappLinks = JSON.parse(
    //     fs.readFileSync('./data/whatsapp_links.json', 'utf-8'),
    // );

    // const whatsappEventsOut = await scrapeURLs(whatsappLinks);
    // fs.writeFileSync(
    //     './data/all_whatsapp_events.json',
    //     JSON.stringify(whatsappEventsOut, null, 2),
    // );

    // const whatsappEvents = JSON.parse(fs.readFileSync('./data/all_whatsapp_events.json', 'utf-8'));

    const pluraEvents = JSON.parse(
        fs.readFileSync('./data/all_plura_events.json', 'utf-8'),
    );
    const eventbriteEvents = JSON.parse(
        fs.readFileSync('./data/all_eventbrite_events.json', 'utf-8'),
    );

    const filteredEvents = filterEvents([
        ...pluraEvents,
        ...eventbriteEvents,
    ]);

    fs.writeFileSync(
        '../src/EventCalendar/all_events.json',
        JSON.stringify(filteredEvents, null, 2),
    );

    // const filteredWhatsappEvents = filterEvents(whatsappEvents);

    // fs.writeFileSync(
    //     '../src/EventCalendar/whatsapp_events.json',
    //     JSON.stringify(filteredWhatsappEvents, null, 2),
    // );


    createIcal(filteredEvents);
};

main();
