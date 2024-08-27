import fs from "fs";
import { scrapePluraEvents } from "./scrapers/scrapePluraEvents.js";
import { scrapeEventbriteEventsFromOrganizersURLs } from "./scrapers/eventbrite/scrapeEventbriteEventsFromOrganizerPage.js";
import { scrapeOrganizerTantraNY } from "./scrapers/organizers/tantra_ny.js";
import { writeEventsToDB } from "./helpers/writeEventsToDB.js";
export const filterEvents = (events) => {
    const EXCLUDE_EVENT_IDS = [
        "e7179b3b-b4f8-40df-8d87-f205b0caaeb1",
        "036f8010-9910-435f-8119-2025a046f452",
    ];
    const filteredEvents = events.filter((event) => !EXCLUDE_EVENT_IDS.includes(event.id));
    return filteredEvents;
};
const getURLCache = (events) => {
    return events.map((event) => event.eventUrl);
};
const fileOperations = {
    readJSON: (path) => {
        if (!fs.existsSync(path)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(path, "utf-8"));
    },
    writeJSON: (path, data) => {
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    },
};
const DATA_FILES = {
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
};
const getFromFile = (source) => {
    return fileOperations.readJSON(DATA_FILES[source].path);
};
const writeFile = (source, events) => {
    fileOperations.writeJSON(DATA_FILES[source].path, events);
};
const scrapeKinkEventbrite = async (urlCache) => {
    const kinkEventbriteOrganizerURLs = getFromFile("kink_eventbrite_organizer_urls").map((organizer) => organizer.url);
    const kinkEventbriteEventsOut = await scrapeEventbriteEventsFromOrganizersURLs({
        organizerURLs: kinkEventbriteOrganizerURLs,
        sourceMetadata: {
            source_ticketing_platform: "Eventbrite",
            dataset: "Kink",
        },
        urlCache,
    });
    console.log('kinkEventbriteEventsOut', kinkEventbriteEventsOut);
    writeFile("kink_eventbrite_events", kinkEventbriteEventsOut);
};
const scrapePlura = async (urlCache) => {
    const pluraEventsOut = await scrapePluraEvents({
        sourceMetadata: {
            source_ticketing_platform: "Plura",
            dataset: "Kink",
        },
    });
    writeFile("plura", pluraEventsOut);
};
const scrapeOrganizerTantraNYEvents = async (urlCache) => {
    const organizerTantraNYEventsOut = await scrapeOrganizerTantraNY({
        url: "https://tantrany.com/api/events-listings.json.php?user=toli",
        sourceMetadata: {
            dataset: "Kink",
            source_origination_platform: "organizer_api",
        },
    });
    writeFile("tantra_ny", organizerTantraNYEventsOut);
};
export const scrapeEvents = async () => {
    const allEventsOld = getFromFile("all");
    const urlCache = getURLCache(allEventsOld);
    const allScrapers = await Promise.all([
        scrapeKinkEventbrite(urlCache),
        scrapePlura(urlCache),
        scrapeOrganizerTantraNYEvents(urlCache),
    ]);
    const pluraEvents = getFromFile("plura");
    const kinkEventbriteEvents = getFromFile("kink_eventbrite_events");
    console.log('kinkEventbriteEvents', kinkEventbriteEvents);
    const tantraNYEvents = getFromFile("tantra_ny");
    const filteredEvents = filterEvents([
        ...pluraEvents,
        ...kinkEventbriteEvents,
        ...tantraNYEvents,
    ]);
    writeEventsToDB(filteredEvents);
    return filteredEvents;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zY3JhcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUtwQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUM1SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFL0QsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBZSxFQUFFLEVBQUU7SUFFNUMsTUFBTSxpQkFBaUIsR0FBRztRQUN0QixzQ0FBc0M7UUFDdEMsc0NBQXNDO0tBQ3pDLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUNoQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUN4QyxDQUFDO0lBRWIsT0FBTyxjQUFjLENBQUM7QUFDMUIsQ0FBQyxDQUFDO0FBSUYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFlLEVBQVksRUFBRTtJQUM5QyxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFZLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUM7QUFNRixNQUFNLGNBQWMsR0FBRztJQUNuQixRQUFRLEVBQUUsQ0FBQyxJQUE2QixFQUFFLEVBQUU7UUFDeEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLEVBQUUsQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxD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