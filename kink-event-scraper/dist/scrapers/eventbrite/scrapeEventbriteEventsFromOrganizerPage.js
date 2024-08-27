import puppeteer from "puppeteer";
import axios from "axios";
import { localDateTimeToISOString } from "../../helpers/dateUtils.js";
const scrapeEventDetails = async ({ url: apiUrl, sourceMetadata, urlCache, }) => {
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;
        const events = data.events.map((event) => {
            const start_date = localDateTimeToISOString(event.start_date, event.start_time);
            const end_date = localDateTimeToISOString(event.end_date, event.end_time);
            return {
                id: `eventbrite-${event.id}`,
                name: event.name,
                start_date,
                end_date,
                location: event.primary_venue.address.localized_address_display,
                price: event.ticket_availability.minimum_ticket_price.display,
                imageUrl: event.image.url,
                organizer: event.primary_organizer.name,
                organizerUrl: event.primary_organizer.url,
                eventUrl: event.url,
                summary: event.summary,
                tags: event.tags.map((tag) => tag.display_name),
                min_ticket_price: event.ticket_availability.minimum_ticket_price.display,
                max_ticket_price: event.ticket_availability.maximum_ticket_price.display,
                source_ticketing_platform: "Eventbrite",
                ...sourceMetadata,
            };
        });
        return events;
    }
    catch (error) {
        return [];
    }
};
const scrapeEventbriteEventsFromOrganizerPage = async ({ url, sourceMetadata, }) => {
    const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true
    });
    const page = await browser.newPage();
    try {
        let timeout;
        const apiPromise = new Promise((resolve, reject) => {
            page.on("request", (request) => {
                const url = request.url();
                if (url.includes("https://www.eventbrite.com/api/v3/destination/event")) {
                    timeout && clearTimeout(timeout);
                    resolve(url);
                }
            });
        });
        const timeoutPromise = new Promise((resolve, reject) => {
            timeout = setTimeout(() => {
                console.log(`Organizer URL ${url} contains no events`);
                resolve("");
            }, 10000);
        });
        await page.goto(url, { waitUntil: "networkidle2" });
        const apiUrl = await Promise.race([apiPromise, timeoutPromise]);
        if (!apiUrl) {
            return [];
        }
        console.log("Captured API URL:", apiUrl);
        const events = await scrapeEventDetails({ url: apiUrl, sourceMetadata });
        return events;
    }
    catch (error) {
        return [];
    }
    finally {
        await browser.close();
    }
};
export const scrapeEventbriteEventsFromOrganizersURLs = async ({ organizerURLs, sourceMetadata, urlCache, }) => {
    const events = [];
    for (const organizerURL of organizerURLs) {
        const organizerEvents = await scrapeEventbriteEventsFromOrganizerPage({
            url: organizerURL,
            sourceMetadata,
            urlCache,
        });
        events.push(...organizerEvents);
    }
    return events;
};
export default scrapeEventbriteEventsFromOrganizerPage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlRXZlbnRicml0ZUV2ZW50c0Zyb21Pcmdhbml6ZXJQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3NjcmFwZXJzL2V2ZW50YnJpdGUvc2NyYXBlRXZlbnRicml0ZUV2ZW50c0Zyb21Pcmdhbml6ZXJQYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUNsQyxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFHMUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHdEUsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLEVBQUUsRUFDaEMsR0FBRyxFQUFFLE1BQU0sRUFDWCxjQUFjLEVBQ2QsUUFBUSxHQUNNLEVBQW9CLEVBQUU7SUFDcEMsSUFBSSxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFHM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFVLEVBQVMsRUFBRTtZQUNuRCxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FDekMsS0FBSyxDQUFDLFVBQVUsRUFDaEIsS0FBSyxDQUFDLFVBQVUsQ0FDakIsQ0FBQztZQUNGLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFFLE9BQU87Z0JBQ0wsRUFBRSxFQUFFLGNBQWMsS0FBSyxDQUFDLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUNoQixVQUFVO2dCQUNWLFFBQVE7Z0JBQ1IsUUFBUSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLHlCQUF5QjtnQkFD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