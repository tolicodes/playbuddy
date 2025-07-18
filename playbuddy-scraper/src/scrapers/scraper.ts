import { NormalizedEventInput } from "../commonTypes.js";
import { scrapePluraEvents } from "./scrapePluraEvents.js";
import { scrapeEventsFromOrganizers } from "./eventbrite/scrapeEventsFromOrganizers.js";
import { scrapeOrganizerTantraNY } from "./organizers/tantra_ny.js";
import { writeEventsToDB } from "../helpers/writeEventsToDB/writeEventsToDB.js";
import { readJSON, writeJSON } from '../helpers/fileUtils.js'
import axios from "axios";

/**
 * Specify which scrapers to run this cycle.
 *   - "eb"       → Eventbrite scraper
 *   - "plura"    → Plura scraper
 *   - "tantrany" → TantraNY scraper
 *
 * You can toggle these entries on or off as needed.
 */
const SCRAPE_TARGETS: Array<"eb" | "plura" | "tantrany"> = [
    "eb",
    "plura",
    "tantrany",
];


/**
 * Community IDs
 */
export const CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID =
    "72f599a9-6711-4d4f-a82d-1cb66eac0b7b";

/**
 * Filters out default Plura events by original_id.
 */
export const filterEvents = (
    events: NormalizedEventInput[]
): NormalizedEventInput[] => {
    const EXCLUDE_EVENT_IDS = [
        "e7179b3b-b4f8-40df-8d87-f205b0caaeb1", // New York LGBTQ+ Community Events Calendar
        "036f8010-9910-435f-8119-2025a046f452", // NYC Kink Community Events Calendar
    ];

    return events.filter(
        (event) =>
            !event?.original_id || !EXCLUDE_EVENT_IDS.includes(event.original_id)
    );
};

/**
 * Each scraper returns a Promise<NormalizedEventInput[]> without writing files.
 */
const scrapeKinkEventbrite = async (
    organizerURLs: string[]
): Promise<NormalizedEventInput[]> => {
    return scrapeEventsFromOrganizers({
        organizerURLs,
        eventDefaults: {
            source_ticketing_platform: "Eventbrite",
            dataset: "Kink",
            communities: [{ id: CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID }],
        },
    });
};

const scrapePlura = async (): Promise<NormalizedEventInput[]> => {
    return scrapePluraEvents({
        eventDefaults: {
            source_ticketing_platform: "Plura",
            dataset: "Kink",
            communities: [{ id: CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID }],
        },
    });
};

const scrapeOrganizerTantraNYEvents = async (): Promise<
    NormalizedEventInput[]
> => {
    return scrapeOrganizerTantraNY({
        url: "https://tantrany.com/api/events-listings.json.php?user=toli",
        eventDefaults: {
            dataset: "Kink",
            source_origination_platform: "organizer_api",
        },
    });
};

/**
 * SCRAPERS maps each target key to:
 *   - fn: the scraping function
 *   - inputFile?: path to a JSON file used as input (if needed)
 *   - outputFile: path where raw output should be written
 *
 * Each outputFile ends in "_events.json".
 */
const SCRAPERS: Record<
    "eb" | "plura" | "tantrany",
    {
        fn: (input?: string[]) => Promise<NormalizedEventInput[]>;
        inputFile?: string;
        outputFile: string;
    }
> = {
    eb: {
        fn: async () => {
            const organizerURLs = readJSON(
                SCRAPERS.eb.inputFile!
            ) as string[];
            return scrapeKinkEventbrite(organizerURLs);
        },
        inputFile: "./data/datasets/kink_eventbrite_organizer_urls.json",
        outputFile: "./data/outputs/all_kink_eventbrite_events.json",
    },
    plura: {
        fn: scrapePlura,
        outputFile: "./data/outputs/all_plura_events.json",
    },
    tantrany: {
        fn: scrapeOrganizerTantraNYEvents,
        outputFile: "./data/outputs/organizers_tantra_ny_events.json",
    },
};

/**
 * File path for filtered events.
 */
const FILTERED_EVENTS_FILE = "./data/outputs/filtered_events.json";

const runClassify = () => {
    axios.get(process.env.PLAYBUDDY_API_URL + '/classifications/classify');
}

/**
 * Master function to run selected scrapers, merge outputs, filter,
 * and push new events to DB. Always writes each scraper's raw output to disk.
 */
export const scrapeEvents = async (): Promise<NormalizedEventInput[]> => {
    // 1) Run selected scrapers based on SCRAPE_TARGETS
    const scrapeResults: NormalizedEventInput[][] = [];

    for (const target of SCRAPE_TARGETS) {
        const { fn, outputFile } = SCRAPERS[target];
        const events = await fn();
        writeJSON(outputFile, events);
        scrapeResults.push(events);
    }

    // 2) Merge all results in memory (no reading of old files)
    const allMerged: NormalizedEventInput[] = scrapeResults.flat();

    // 3) Filter out default/excluded IDs
    const filtered = filterEvents(allMerged);

    // 4) Persist filtered list to disk and write to DB
    writeJSON(FILTERED_EVENTS_FILE, filtered);
    await writeEventsToDB(filtered);

    await runClassify();

    return filtered;
};  
