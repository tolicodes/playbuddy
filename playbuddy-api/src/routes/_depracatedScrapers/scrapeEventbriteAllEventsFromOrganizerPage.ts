// import axios from "axios";

// import cheerio from "cheerio";
// import scrapeOrganizerPage from "../eventbrite/scrapeEventsFromOrganizers.js";
// import { NormalizedEventInput } from "../../commonTypes.js";

// // Given an event page, it goes to the organizer page and scrapes all events from there
// // Used for whatsapp groups to scrape all events from an organizer
// const scrapeEventbriteAllEventsFromEventPage = async ({
//     url,
//     eventDefaults,
// }: {
//     url: string;
//     eventDefaults: NormalizedEventInput;
// }): Promise<NormalizedEventInput[] | null> => {
//     try {
//         const { data } = await axios.get(url);
//         const $ = cheerio.load(data);

//         const organizerUrl =
//             $('[data-testid="organizer-name"] a').attr("href") || "";

//         if (!organizerUrl) {
//             console.log("No organizer URL found for ", eventDefaults.source_url);
//             return null;
//         }

//         const events = await scrapeOrganizerPage({
//             url: organizerUrl,
//             eventDataSource: eventDefaults,
//         });

//         const eventsWithMetadata = events.map((event) => ({
//             ...event,
//             ...eventDefaults,
//         }));

//         return eventsWithMetadata;
//     } catch (error) {

//         // @ts-ignore
//         if (error?.response?.status === 404) {
//             console.log(`Eventbrite event not found: ${eventDefaults.source_url}`);
//             return [];
//         }

//         console.error(
//             `Error scraping Eventbrite organizer from event page ${eventDefaults.source_url}:`,
//             error,
//         );
//         throw new Error("Error scraping Eventbrite organizer from event page");
//     }
// };

// export default scrapeEventbriteAllEventsFromEventPage;