import fs from "fs";
import { CreateEventInput } from "./commonTypes.js";
import { scrapeWhatsappLinks } from "./scrapers/scrapeWhatsapp.js";
import { scrapePluraEvents } from "./scrapers/scrapePluraEvents.js";
import { scrapeEventbriteEventsFromOrganizersURLs } from "./scrapers/eventbrite/scrapeEventbriteEventsFromOrganizerPage.js";
import { scrapeOrganizerTantraNY } from "./scrapers/organizers/tantra_ny.js";
import { writeEventsToDB } from "./helpers/writeEventsToDB/writeEventsToDB.js";
import { scrapeAcroFestivals, API_URL as ACROFESTIVALS_API_URL } from "./scrapers/acrofestivals.js";
import { scrapeFacebookEvents as scrapeFacebook } from "./scrapers/facebook.js";
import scrapeURLs from './helpers/scrapeURLs.js';

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

// const getURLCache = (events: CreateEventInput[]): URLCache => {
//     return events.map((event: CreateEventInput) => event.event_url);
// };

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
        if (!fs.existsSync('./data/outputs')) {
            fs.mkdirSync('./data/outputs', { recursive: true });
            console.log('Directory created');
        }

        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    },
};

const DATA_FILES: Record<string, FilePath> = {
    // DATASET input
    kink_eventbrite_organizer_urls: {
        path: "./data/datasets/kink_eventbrite_organizer_urls.json",
    },

    burlesque_eventbrite_organizer_urls: {
        path: "./data/datasets/burlesque_eventbrite_organizer_urls.json",
    },

    whatsapp_groups: {
        path: "./data/datasets/whatsapp_groups.json",
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
    },

    burlesque_eventbrite_events: {
        path: "./data/outputs/all_burlesque_eventbrite_events.json",
    },
};

const getFromFile = (source: string): CreateEventInput[] => {
    return fileOperations.readJSON(DATA_FILES[source].path);
};

const getInputFile = (source: string): any[] => {
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

const filterAcroFacebookEvents = (events: CreateEventInput[]) => {
    // const EXCLUDE_EVENT_NAMES = [
    //     "workshop",
    //     "class",
    //     "jam",
    //     "meetup",
    //     "session",
    //     "fundamentals",
    //     "party",
    //     "potluck",
    //     "foundation",
    //     "exchange",
    //     "clinic",
    //     "program",
    //     "open gym",
    //     "intro",
    //     "pop-up",

    // ]
    // return events.filter((event) => !EXCLUDE_EVENT_NAMES.some((name) => event.name.toLowerCase().includes(name)));

    const INCLUDE_EVENT_NAMES = [
        "retreat",
        "festival",
        "getaway",
        "camp",
        "immersion",
        "expedition",
        "journey",
        "escape",
        "intensive",
        "summit",
        "weekend",
        "weeklong",
        "adventure"
    ];


    // Filter events that are long duration or have included keywords
    return events.filter((event) => {
        const eventNameLower = event.name.toLowerCase();

        // Check if event name contains any of the included keywords
        const hasIncludedKeyword = INCLUDE_EVENT_NAMES.some(name =>
            eventNameLower.includes(name.toLowerCase())
        );

        // Check if event name contains duration keywords
        const hasLongDuration = event.metadata.duration.includes('day') ||
            event.metadata.duration.includes('week');

        return hasIncludedKeyword || hasLongDuration;
    });
}

const scrapeAcroFacebookEvents = async (urlCache: URLCache) => {
    const facebookAcroEventsOut = await scrapeFacebook({
        sourceMetadata: {
            dataset: "Acro",
            communities: [{
                id: ACRO_COMMUNITY_ID
            }],
            source_origination_platform: "facebook",
        },
        urlCache: [],
        url: 'http://facebook.com',
    });

    const filteredAcroFacebookEvents = filterAcroFacebookEvents(facebookAcroEventsOut);

    writeFile("acro_facebook", filteredAcroFacebookEvents);

    return filteredAcroFacebookEvents;
}

export const scrapeEvents = async ({
    freq = 'hourly'
}: {
    freq: 'hourly' | 'daily'
}) => {
    // GENERAL SETUP    
    // we will fetch events later for matching
    const urlCache: string[] = []

    if (freq === 'hourly') {
        await Promise.all([
            scrapeKinkEventbrite(urlCache),
            scrapePlura(urlCache),
            scrapeOrganizerTantraNYEvents(urlCache),
            scrapeAcroFestivalsEvents(urlCache)
        ]);

        // Combine hourly events
        const pluraEvents = getFromFile("plura");
        const kinkEventbriteEvents = getFromFile("kink_eventbrite_events");
        const tantraNYEvents = getFromFile("tantra_ny");
        const acroFestivalsEvents = getFromFile("acro_festivals");

        const filteredEvents = filterEvents([
            ...pluraEvents,
            ...kinkEventbriteEvents,
            ...tantraNYEvents,
            ...acroFestivalsEvents
        ]);

        await writeEventsToDB(filteredEvents);
        return filteredEvents;

    } else if (freq === 'daily') {
        await scrapeAcroFacebookEvents(urlCache);

        const acroFacebookEvents = getFromFile("acro_facebook");
        const filteredEvents = filterEvents(acroFacebookEvents);

        await writeEventsToDB(filteredEvents);
        return filteredEvents;
    }

    return [];
};

export const scrapeWhatsappEvents = async (urlCache: URLCache = []) => {
    const whatsappGroups = getInputFile("whatsapp_groups") as { group_name: string, community_id: string }[];

    const whatsappLinksOut = await scrapeWhatsappLinks(whatsappGroups);

    writeFile("whatsapp_links", whatsappLinksOut);

    // const whatsappLinksOut = getFromFile("whatsapp_links");

    const whatsappEventsOut = await scrapeURLs(whatsappLinksOut, urlCache);
    writeFile("whatsapp_events", whatsappEventsOut);

    const withVisibility = whatsappEventsOut.map((event) => ({
        ...event,
        visibility: 'private' as 'private' | 'public',
    }));

    writeEventsToDB(withVisibility);
}