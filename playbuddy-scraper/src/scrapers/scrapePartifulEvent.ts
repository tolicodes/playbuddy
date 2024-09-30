import puppeteer from "puppeteer";
import cheerio from "cheerio";

import { ScraperParams } from "./types.js";
import { Event } from "../commonTypes.js";
import { convertPartifulDateTime } from "../helpers/partifulDateUtils.js";
import { extractHtmlToMarkdown } from "../helpers/extractHtmlToMarkdown.js";
import { puppeteerConfig } from "../config.js";


async function scrapePartifulEvent({
    url: eventId,
    sourceMetadata,
    urlCache,
}: ScraperParams): Promise<Event[] | null> {
    const url = `https://partiful.com/e/${eventId}`;
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: "networkidle2" });
        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract event details
        const name = $("h1 span.summary").first().text();
        const dateString = $("time").attr("datetime") || "";
        const timeString = $("time div div div:nth-child(2)").text() || "";
        const { start_date, end_date } = convertPartifulDateTime({
            dateString,
            timeString,
        });

        if (!start_date) {
            return null;
        }

        const location = $(".icon-location-with-lock + span").text().trim();
        const priceText = $(".icon-ticket").next().text().trim();
        const priceMatch = priceText.match(/\$\d+(\.\d+)?/);
        const price = priceMatch ? priceMatch[0] : "";
        const imageUrl = $("section div img").attr("src") || "";
        const organizer = $(".icon-crown-fancy").next().next().text().trim();
        const organizerUrl = ""; // Currently not extracting, need to fix this
        const description = await extractHtmlToMarkdown(page, "div.description")
        const tags: string[] = []; // Assuming tags are available in a specific selector, update accordingly

        const eventDetails: Event = {
            id: `plura-${eventId}`,
            type: "event",
            recurring: "none",
            original_id: `plura-${eventId}`,
            organizer: {
                id: '', // actually filled in by the DB, need to fill it in for ts, fix later
                name: organizer,
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
