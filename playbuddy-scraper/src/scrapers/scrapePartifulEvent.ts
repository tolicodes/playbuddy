import puppeteer from "puppeteer";
import cheerio from "cheerio";

import { ScraperParams } from "./types.js";
import { CreateEventInput } from "../commonTypes.js";
import { puppeteerConfig } from "../config.js";
import TurndownService from "turndown";

async function scrapePartifulEvent({
    url: eventId,
    sourceMetadata,
    urlCache,
}: ScraperParams): Promise<CreateEventInput[] | null> {
    // user Id to name map
    async function getOrganizerData(page: puppeteer.Page): Promise<Map<string, string>> {
        const userDataCache = new Map<string, string>();
        return new Promise((resolve) => {
            const responseHandler = async (response: puppeteer.HTTPResponse) => {
                if (response.url().includes('getUsers') && response.request().method() === 'POST') {
                    const responseBody = await response.json();
                    const users = responseBody.result.data;

                    if (!users) return;

                    for (const user of users) {
                        userDataCache.set(user.id, user.name);
                    }
                }
            };

            page.on('response', responseHandler);

            // Trigger the network request by scrolling
            page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

            // Set a timeout to resolve with null if no matching response is found
            setTimeout(() => {
                page.off('response', responseHandler);
                resolve(userDataCache);
            }, 10000);
        });
    }

    const url = `https://partiful.com/e/${eventId}`;
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();

    try {
        const userDataCachePromise = getOrganizerData(page);

        await page.goto(url, { waitUntil: "networkidle2" });


        const html = await page.content();
        const $ = cheerio.load(html);

        const el = $('#__NEXT_DATA__');
        const json = el.text();
        const data = JSON.parse(json);
        const event = data.props.pageProps.event;

        // Extract event details from the parsed JSON data
        const name = event.title;
        const start_date = event.startDate;

        const defaultEndTime = new Date(new Date(start_date).getTime() + 3 * 60 * 60 * 1000).toISOString();
        const end_date = event.endDate ? event.endDate : defaultEndTime;

        if (!start_date) {
            return null;
        }

        const location = ""; // Location is not provided in the JSON data
        const price = event.ticketing?.price ? `$${event.ticketing.price}` : "";
        const imageUrl = event.image?.url || "";

        const updatedBy = event.updatedBy;

        // Extract user ID from updatedBy
        const organizerUserId = updatedBy.split('/').pop() || '';

        const userDataCache = await userDataCachePromise;

        const organizerName = userDataCache.get(organizerUserId);

        const organizerUrl = "https://partiful.com/u/" + organizerUserId // Organizer URL is not available in the JSON data

        const turndownService = new TurndownService();

        // Convert HTML to Markdown
        const description = turndownService.turndown((event.description));

        const tags: string[] = []; // Tags are not provided in the JSON data

        const eventDetails: CreateEventInput = {
            type: "event",
            recurring: "none",
            original_id: `partiful-${eventId}`,
            organizer: {
                name: organizerName || "",
                original_id: organizerUserId,
                url: organizerUrl,
            },
            name,
            start_date,
            end_date,
            image_url: imageUrl,
            event_url: url,
            ticket_url: url,
            location,
            price,
            description,
            tags,
            source_ticketing_platform: "Partiful",
            ...sourceMetadata,
        };

        return [eventDetails];
    } catch (error) {
        console.error("Error scraping Partiful event:", error);
        return null;
    } finally {
        await browser.close();
    }
}

export default scrapePartifulEvent;
