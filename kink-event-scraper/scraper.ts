// import { scrapePluraEvents } from './scrapePluraEvents';
import fs from 'fs';
import { Event, SourceMetadata } from './types';
import { createIcal } from './helpers/ical';

import scrapeURLs from './helpers/scrapeURLs';
import { scrapeWhatsappLinks } from './scrapers/scrapeWhatsapp';
import { scrapePluraEvents } from './scrapers/scrapePluraEvents';
import { scrapeEventbriteEventsFromOrganizersURLs } from './scrapers/eventbrite/scrapeEventbriteEventsFromOrganizerPage';
import { scrapeOrganizerTantraNY } from './scrapers/organizers/tantra_ny';

export const filterEvents = (events: Event[]) => {
    // these are default Plura events that we want to exclude from the calendar
    const EXCLUDE_EVENT_IDS = [
        'e7179b3b-b4f8-40df-8d87-f205b0caaeb1', // New York LGBTQ+ Community Events Calendar
        '036f8010-9910-435f-8119-2025a046f452', // NYC Kink Community Events Calendar
    ];

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

const getAllEvents = () => {
    if (!fs.existsSync('./data/all_events.json')) {
        return [];
    }
    return JSON.parse(fs.readFileSync('./data/all_events.json', 'utf-8'))
}

const writeAllEvents = (events: Event[]) => {
    fs.writeFileSync('./data/all_events.json', JSON.stringify(events, null, 2))
}

const writeAllEventsToFrontend = (events: Event[]) => {
    fs.writeFileSync('../src/EventCalendar/all_events.json', JSON.stringify(events, null, 2))
}

const writeAllWhatsappEventsToFrontend = (events: Event[]) => {
    fs.writeFileSync('../src/EventCalendar/whatsapp_events.json', JSON.stringify(events, null, 2))
}

const getURLCache = (events: Event[]): string[] => {
    return events.map((event: Event) => event.eventUrl);
}

// EVENTBRITE
const getKinkEventbriteOrganizerURLs = () => {
    if (!fs.existsSync('./data/kink_eventbrite_organizers.json')) {
        return [];
    }
    const organizers = JSON.parse(fs.readFileSync('./data/kink_eventbrite_organizers.json', 'utf-8'))
    return organizers.map((organizer: any) => organizer.url);
}

const getKinkEventbriteEvents = () => {
    if (!fs.existsSync('./data/all_kink_eventbrite_events.json')) {
        return [];
    }
    return JSON.parse(fs.readFileSync('./data/all_kink_eventbrite_events.json', 'utf-8'))
}

const writeKinkEventbriteEvents = (events: Event[]) => {
    fs.writeFileSync('./data/all_kink_eventbrite_events.json', JSON.stringify(events, null, 2))
}

// PLURA
const getPluraEvents = () => {
    if (!fs.existsSync('./data/all_plura_events.json')) {
        return [];
    }
    return JSON.parse(fs.readFileSync('./data/all_plura_events.json', 'utf-8'))
}

const writePluraEvents = (events: Event[]) => {
    fs.writeFileSync('./data/all_plura_events.json', JSON.stringify(events, null, 2))
}

// WHATSAPP
const getWhatsappLinks = () => {
    if (!fs.existsSync('./data/whatsapp_links.json')) {
        return [];
    }
    return JSON.parse(fs.readFileSync('./data/whatsapp_links.json', 'utf-8'))
}

const writeWhatsappLinks = (SourceMetadata: SourceMetadata[]) => {
    fs.writeFileSync('./data/whatsapp_links.json', JSON.stringify(SourceMetadata, null, 2))
}

const getWhatsappEvents = () => {

    if (!fs.existsSync('./data/all_whatsapp_events.json')) {
        return [];
    }
    return JSON.parse(fs.readFileSync('./data/all_whatsapp_events.json', 'utf-8'))
}

const writeWhatsappEvents = (events: Event[]) => {
    fs.writeFileSync('./data/all_whatsapp_events.json', JSON.stringify(events, null, 2))
}

// ORGANIZERS
// Tantra NY
const ORGANIZER_FILES = {
    'tantra_ny': './data/organizers/tantra_ny_events.json',
}
const getOrganizerTantraNYEvents = () => {
    if (!fs.existsSync(ORGANIZER_FILES['tantra_ny'])) {
        return [];
    }
    return JSON.parse(fs.readFileSync(ORGANIZER_FILES['tantra_ny'], 'utf-8'))
}

const writeOrganizerTantraNYEvents = (events: Event[]) => {
    fs.writeFileSync(ORGANIZER_FILES['tantra_ny'], JSON.stringify(events, null, 2))
}

const main = async () => {
    // GENERAL SETUP

    const allEventsOld = getAllEvents();
    const kinkEventbriteOrganizerURLs = getKinkEventbriteOrganizerURLs();

    // all event cache
    const urlCache = getURLCache(allEventsOld)

    // SCRAPE EVENTBRITE EVENTS
    const kinkEventbriteEventsOut = await scrapeEventbriteEventsFromOrganizersURLs({
        organizerURLs: kinkEventbriteOrganizerURLs,
        sourceMetadata: {
            source_ticketing_platform: 'Eventbrite',
            dataset: 'Kink'
        },
        urlCache,
    })

    writeKinkEventbriteEvents(kinkEventbriteEventsOut);

    // SCRAPE PLURA EVENTS
    const pluraEventsOut = await scrapePluraEvents({
        sourceMetadata: {
            source_ticketing_platform: 'Plura',
            dataset: 'Kink'
        },
    });
    writePluraEvents(pluraEventsOut);

    const organizerTantraNYEventsOut = await scrapeOrganizerTantraNY({
        url: 'https://tantrany.com/api/events-listings.json.php?user=toli',
        sourceMetadata: {
            dataset: 'Kink',
            source_origination_platform: 'organizer_api',
        }
    });

    writeOrganizerTantraNYEvents(organizerTantraNYEventsOut);

    // // SCRAPE WHATSAPP EVENTS
    // const whatsappLinksOut = await scrapeWhatsappLinks();

    // writeWhatsappLinks(whatsappLinksOut)

    // const whatsappLinks = getWhatsappLinks();

    // const whatsappEventsOut = await scrapeURLs(whatsappLinks, urlCache);
    // writeWhatsappEvents(whatsappEventsOut);

    // Combine All Events

    const pluraEvents = getPluraEvents();
    const kinkEventbriteEvents = getKinkEventbriteEvents();
    const tantraNYEvents = getOrganizerTantraNYEvents();
    // const whatsappEvents = getWhatsappEvents();


    // Filter them to exclude certain events and dedupe
    const filteredEvents = filterEvents([
        ...pluraEvents,
        ...kinkEventbriteEvents,
        ...tantraNYEvents
        // For now keeping them out since they're not all kink related
        // ...whatsappEvents
    ]);

    writeAllEvents(filteredEvents);
    writeAllEventsToFrontend(filteredEvents);

    // // Separate calendar for whatsapp events
    // const filteredWhatsappEvents = filterEvents(whatsappEvents);
    // writeAllWhatsappEventsToFrontend(filteredWhatsappEvents)

    // Write iCal feed
    createIcal(filteredEvents);
};

main();