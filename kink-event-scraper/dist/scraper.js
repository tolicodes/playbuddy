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