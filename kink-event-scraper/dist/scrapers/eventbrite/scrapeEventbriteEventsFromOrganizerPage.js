import puppeteer from "puppeteer";
import axios from "axios";
import TurndownService from 'turndown';
import { localDateTimeToISOString } from "../../helpers/dateUtils.js";
const scrapeEventDetails = async ({ url: apiUrl, sourceMetadata, urlCache, }) => {
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;
        const events = data.events.map((event) => {
            const start_date = localDateTimeToISOString(event.start_date, event.start_time);
            const end_date = localDateTimeToISOString(event.end_date, event.end_time);
            const turndownService = new TurndownService();
            const summaryMarkdown = turndownService.turndown(event.description.html);
            console.log('summaryMarkdown', summaryMarkdown);
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
                summary: summaryMarkdown,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlRXZlbnRicml0ZUV2ZW50c0Zyb21Pcmdhbml6ZXJQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3NjcmFwZXJzL2V2ZW50YnJpdGUvc2NyYXBlRXZlbnRicml0ZUV2ZW50c0Zyb21Pcmdhbml6ZXJQYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUNsQyxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDMUIsT0FBTyxlQUFlLE1BQU0sVUFBVSxDQUFDO0FBR3ZDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSXRFLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxFQUFFLEVBQ2hDLEdBQUcsRUFBRSxNQUFNLEVBQ1gsY0FBYyxFQUNkLFFBQVEsR0FDTSxFQUFvQixFQUFFO0lBQ3BDLElBQUksQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBRzNCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBVSxFQUFTLEVBQUU7WUFDbkQsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQ3pDLEtBQUssQ0FBQyxVQUFVLEVBQ2hCLEtBQUssQ0FBQyxVQUFVLENBQ2pCLENBQUM7WUFDRixNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUxRSxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV6RSxPQUFPLENBQUMs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