import fs from "fs";
import { CreateEventInput } from "./commonTypes.js";
// import { scrapeWhatsappLinks } from "./scrapers/scrapeWhatsapp.js";
import { scrapePluraEvents } from "./scrapers/scrapePluraEvents.js";
import { scrapeEventbriteEventsFromOrganizersURLs } from "./scrapers/eventbrite/scrapeEventbriteEventsFromOrganizerPage.js";
import { scrapeOrganizerTantraNY } from "./scrapers/organizers/tantra_ny.js";
import { writeEventsToDB } from "./helpers/writeEventsToDB/writeEventsToDB.js";
import { scrapeAcroFestivals, API_URL as ACROFESTIVALS_API_URL } from "./scrapers/acrofestivals.js";
import { scrapeFacebookEvents as scrapeFacebook } from "./scrapers/facebook.js";

const CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b'
const ACRO_COMMUNITY_ID = '89d31ff0-05bf-4fa7-98e0-3376b44b4997';

export const filterEvents = (events: CreateEventInput[]) => {
    // these are default Plura events that we want to exclude from the calendar
    const EXCLUDE_EVENT_IDS = [
        "e7179b3b-b4f8-40df-8d87-f205b0caaeb1", // New York LGBTQ+ Community Events Calendar
        "036f8010-9910-435f-8119-2025a046f452", // NYC Kink Community Events Calendar
    ];

    const filteredEvents = events.filter(
        (event) => !event?.original_id || !EXCLUDE_EVENT_IDS.includes(event.original_id),
    ) as CreateEventInput[];

    return filteredEvents;
};



type URLCache = string[];

const getURLCache = (events: CreateEventInput[]): URLCache => {
    return events.map((event: CreateEventInput) => event.event_url);
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
    // DATASET input
    kink_eventbrite_organizer_urls: {
        path: "./data/datasets/kink_eventbrite_organizer_urls.json",
    },


    // OUTPUT (git ignored)
    all: {
        path: "./data/outputs/all_events.json",
    },

    whatsapp_links: {
        path: "./data/outputs/whatsapp_links.json",
    },
    whatsapp_events: {
        path: "./data/outputs/all_whatsapp_events.json",
    },



    kink_eventbrite_events: {
        path: "./data/outputs/all_kink_eventbrite_events.json",
    },

    plura: {
        path: "./data/outputs/all_plura_events.json",
    },

    tantra_ny: {
        path: "./data/outputs/organizers_tantra_ny_events.json",
    },
    acro_festivals: {
        path: "./data/outputs/all_acro_festivals_events.json",
    },

    acro_facebook: {
        path: "./data/outputs/acro_facebook.json",
    }
};

const getFromFile = (source: string): CreateEventInput[] => {
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
                communities: [{
                    id: CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID
                }]
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
            communities: [{
                id: CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID
            }]
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
            communities: [{
                id: CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID
            }]
        },
    });

    writeFile("tantra_ny", organizerTantraNYEventsOut);
};

const scrapeAcroFestivalsEvents = async (urlCache: URLCache) => {
    const acroFestivalsEventsOut = await scrapeAcroFestivals({
        sourceMetadata: {
            dataset: "Acro",
            communities: [{
                id: ACRO_COMMUNITY_ID
            }]
        },
        url: ACROFESTIVALS_API_URL,
    });

    writeFile("acro_festivals", acroFestivalsEventsOut);
}

const scrapeFacebookEvents = async (urlCache: URLCache) => {
    const facebookEventsOut = await scrapeFacebook({
        sourceMetadata: {
            dataset: "Acro",
            communities: [{
                id: ACRO_COMMUNITY_ID
            }]
        },
        urlCache: [],
        url: 'http://facebook.com',
    });

    writeFile("acro_facebook", facebookEventsOut);

    return facebookEventsOut;
}

// const scrapeWhatsapp = async (urlCache: URLCache) => {
//     // SCRAPE WHATSAPP EVENTS
//     const whatsappLinksOut = await scrapeWhatsappLinks();

//     writeFile("whatsapp_links", whatsappLinksOut);

//     const whatsappEventsOut = await scrapeURLs(whatsappLinksOut, urlCache);
//     writeFile("whatsapp_events", whatsappEventsOut);
// };

export const scrapeEvents = async ({
    freq = 'hourly'
}: {
    freq: 'hourly' | 'daily'
}) => {
    // GENERAL SETUP    
    // we will fetch events later for matching
    const urlCache: string[] = []

    const allScrapers = await Promise.all([
        scrapeKinkEventbrite(urlCache),
        scrapePlura(urlCache),
        scrapeOrganizerTantraNYEvents(urlCache),
        scrapeAcroFestivalsEvents(urlCache),
        freq === 'daily' && scrapeFacebookEvents(urlCache),
        // scrapeWhatsapp(urlCache)
    ]);

    // Combine All Events
    const pluraEvents = getFromFile("plura");
    const kinkEventbriteEvents = getFromFile("kink_eventbrite_events");
    const tantraNYEvents = getFromFile("tantra_ny");
    const acroFestivalsEvents = getFromFile("acro_festivals");
    const facebookEvents = freq === 'daily' ? getFromFile("acro_facebook") : [];

    // Filter them to exclude certain events and dedupe
    const filteredEvents = filterEvents([
        ...pluraEvents,
        ...kinkEventbriteEvents,
        ...tantraNYEvents,
        ...acroFestivalsEvents,
        ...facebookEvents,
    ]);

    await writeEventsToDB(filteredEvents);

    return filteredEvents

    // Separate calendar for whatsapp events
    // const whatsappEvents = getFromFile('whatsapp');
    // const filteredWhatsappEvents = filterEvents(whatsappEvents);
    // writeAllWhatsappEventsToFrontend(filteredWhatsappEvents)
};
