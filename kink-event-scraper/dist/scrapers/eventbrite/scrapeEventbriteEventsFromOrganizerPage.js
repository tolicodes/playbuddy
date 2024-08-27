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
        console.log(`Error scraping Eventbrite events`, error);
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
        console.log("Captured API URL:", apiUrl, `for organizer URL: ${url}`);
        const events = await scrapeEventDetails({ url: apiUrl, sourceMetadata });
        console.log('organizer events', events);
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
    console.log('events', events);
    return events;
};
export default scrapeEventbriteEventsFromOrganizerPage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlRXZlbnRicml0ZUV2ZW50c0Zyb21Pcmdhbml6ZXJQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3NjcmFwZXJzL2V2ZW50YnJpdGUvc2NyYXBlRXZlbnRicml0ZUV2ZW50c0Zyb21Pcmdhbml6ZXJQYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUNsQyxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDMUIsT0FBTyxlQUFlLE1BQU0sVUFBVSxDQUFDO0FBR3ZDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSXRFLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxFQUFFLEVBQ2hDLEdBQUcsRUFBRSxNQUFNLEVBQ1gsY0FBYyxFQUNkLFFBQVEsR0FDTSxFQUFvQixFQUFFO0lBQ3BDLElBQUksQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBRzNCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBVSxFQUFTLEVBQUU7WUFDbkQsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQ3pDLEtBQUssQ0FBQyxVQUFVLEVBQ2hCLEtBQUssQ0FBQyxVQUFVLENBQ2pCLENBQUM7WUFDRixNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUxRSxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV6RSxPQUFPLENBQUMs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