import fs from "fs";
import { Event } from "./commonTypes.js";

import scrapeURLs from "./helpers/scrapeURLs.js";
// import { scrapeWhatsappLinks } from "./scrapers/scrapeWhatsapp";
import { scrapePluraEvents } from "./scrapers/scrapePluraEvents.js";
import { scrapeEventbriteEventsFromOrganizersURLs } from "./scrapers/eventbrite/scrapeEventbriteEventsFromOrganizerPage.js";
import { scrapeOrganizerTantraNY } from "./scrapers/organizers/tantra_ny.js";
import { writeEventsToDB } from "./helpers/writeEventsToDB.js";
import { scrapeAcroFestivals, API_URL as ACROFESTIVALS_API_URL } from "./scrapers/acrofestivals.js";

export const filterEvents = (events: Event[]) => {
    // these are default Plura events that we want to exclude from the calendar
    const EXCLUDE_EVENT_IDS = [
        "e7179b3b-b4f8-40df-8d87-f205b0caaeb1", // New York LGBTQ+ Community Events Calendar
        "036f8010-9910-435f-8119-2025a046f452", // NYC Kink Community Events Calendar
    ];

    const filteredEvents = events.filter(
        (event) => !EXCLUDE_EVENT_IDS.includes(event.id),
    ) as Event[];

    return filteredEvents;
};

type URLCache = string[];

const getURLCache = (events: Event[]): URLCache => {
    return events.map((event: Event) => event.event_url);
};

interface FilePath {
    path: string;
}

const fileOperations = {
    readJSON: (path: keyof typeof DATA_FILES) => {
        if (!fs.existsSync(path)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(path, "utf-8"));
    },

    writeJSON: (path: keyof typeof DATA_FILES, data: any) => {
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    },
};

const DATA_FILES: Record<string, FilePath> = {
    all: {
        path: "./data/all_events.json",
    },
    all_fe: {
        path: "../src/EventCalendar/all_events.json",
    },

    whatsapp_links: {
        path: "./data/whatsapp_links.json",
    },
    whatsapp_events: {
        path: "./data/all_whatsapp_events.json",
    },
    whatsapp_fe: {
        path: "../src/EventCalendar/whatsapp_events.json",
    },

    // actually URLs
    // DATASET input
    kink_eventbrite_organizer_urls: {
        path: "./data/datasets/kink_eventbrite_organizer_urls.json",
    },

    kink_eventbrite_events: {
        path: "./data/all_kink_eventbrite_events.json",
    },

    plura: {
        path: "./data/all_plura_events.json",
    },

    tantra_ny: {
        path: "./data/organizers/tantra_ny_events.json",
    },
    acro_festivals: {
        path: "./data/all_acro_festivals_events.json",
    }
};

const getFromFile = (source: string) => {
    return fileOperations.readJSON(DATA_FILES[source].path);
};

const writeFile = (source: string, events: any[]) => {
    fileOperations.writeJSON(DATA_FILES[source].path, events);
};

const scrapeKinkEventbrite = async (urlCache: URLCache) => {
    const kinkEventbriteOrganizerURLs = getFromFile(
        "kink_eventbrite_organizer_urls",
    ).map((organizer: any) => organizer.url);

    // SCRAPE EVENTBRITE EVENTS
    const kinkEventbriteEventsOut =
        await scrapeEventbriteEventsFromOrganizersURLs({
            organizerURLs: kinkEventbriteOrganizerURLs,
            sourceMetadata: {
                source_ticketing_platform: "Eventbrite",
                dataset: "Kink",
            },
            urlCache,
        });

    writeFile("kink_eventbrite_events", kinkEventbriteEventsOut);
};

const scrapePlura = async (urlCache: URLCache) => {
    // SCRAPE PLURA EVENTS
    const pluraEventsOut = await scrapePluraEvents({
        sourceMetadata: {
            source_ticketing_platform: "Plura",
            dataset: "Kink",
        },
    });
    writeFile("plura", pluraEventsOut);
};

const scrapeOrganizerTantraNYEvents = async (urlCache: URLCache) => {
    const organizerTantraNYEventsOut = await scrapeOrganizerTantraNY({
        url: "https://tantrany.com/api/events-listings.json.php?user=toli",
        sourceMetadata: {
            dataset: "Kink",
            source_origination_platform: "organizer_api",
        },
    });

    writeFile("tantra_ny", organizerTantraNYEventsOut);
};

const scrapeAcroFestivalsEvents = async (urlCache: URLCache) => {
    const acroFestivalsEventsOut = await scrapeAcroFestivals({
        sourceMetadata: {
            dataset: "Acro",
        },
        url: ACROFESTIVALS_API_URL,
    });

    writeFile("acro_festivals", acroFestivalsEventsOut);
}

// const scrapeWhatsapp = async (urlCache: URLCache) => {
//     // SCRAPE WHATSAPP EVENTS
//     const whatsappLinksOut = await scrapeWhatsappLinks();

//     writeFile("whatsapp_links", whatsappLinksOut);

//     const whatsappEventsOut = await scrapeURLs(whatsappLinksOut, urlCache);
//     writeFile("whatsapp_events", whatsappEventsOut);
// };

export const scrapeEvents = async () => {
    // GENERAL SETUP
    const allEventsOld = getFromFile("all");
    const urlCache = getURLCache(allEventsOld);

    const allScrapers = await Promise.all([
        scrapeKinkEventbrite(urlCache),
        scrapePlura(urlCache),
        scrapeOrganizerTantraNYEvents(urlCache),
        scrapeAcroFestivalsEvents(urlCache),
        //     // scrapeWhatsapp(urlCache)
    ]);

    // Combine All Events
    const pluraEvents = getFromFile("plura");
    const kinkEventbriteEvents = getFromFile("kink_eventbrite_events");
    const tantraNYEvents = getFromFile("tantra_ny");
    const acroFestivalsEvents = getFromFile("acro_festivals");

    // Filter them to exclude certain events and dedupe
    const filteredEvents = filterEvents([
        ...pluraEvents,
        ...kinkEventbriteEvents,
        ...tantraNYEvents,
        ...acroFestivalsEvents
    ]);

    await writeEventsToDB(filteredEvents);

    return filteredEvents

    // // Separate calendar for whatsapp events
    // const whatsappEvents = getFromFile('whatsapp');
    // const filteredWhatsappEvents = filterEvents(whatsappEvents);
    // writeAllWhatsappEventsToFrontend(filteredWhatsappEvents)
};
