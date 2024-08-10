import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

import { Event, ScraperParams } from '../types';
import { convertPartifulDateTime } from '../helpers/dateUtils';

async function scrapePartifulEvent({
    url: eventId,
    sourceMetadata,
    urlCache,
}: ScraperParams): Promise<Event[] | null> {
    const url = `https://partiful.com/e/${eventId}`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract event details
        const name = $('h1 span.summary').first().text();
        const dateString = $('time').attr('datetime') || '';
        const timeString = $('time div div div:nth-child(2)').text() || '';
        const { start_date, end_date } = convertPartifulDateTime({ dateString, timeString });

        if (!start_date) {
            return null;
        }

        const location = $('.icon-location-with-lock + span').text().trim();
        const priceText = $('.icon-ticket').next().text().trim();
        const priceMatch = priceText.match(/\$\d+(\.\d+)?/);
        const price = priceMatch ? priceMatch[0] : '';
        const min_ticket_price = '';
        const max_ticket_price = '';
        const imageUrl = $('section div img').attr('src') || '';
        const organizer = $('.icon-crown-fancy').next().next().text().trim();
        const organizerUrl = ''; // Currently not extracting, need to fix this
        const summary = $('div.description').text().trim();
        const tags: string[] = []; // Assuming tags are available in a specific selector, update accordingly

        const eventDetails: Event = {
            id: eventId,
            name,
            start_date,
            end_date,
            location,
            price,
            imageUrl,
            organizer,
            organizerUrl,
            eventUrl: url,
            summary,
            tags,
            min_ticket_price,
            max_ticket_price,
            source_ticketing_platform: 'Partiful',
            ...sourceMetadata,
        };

        console.log({
            eventDetails,
        });

        return [eventDetails];
    } catch (error) {
        console.error('Error scraping Partiful event:', error);
        return null;
    } finally {
        await browser.close();
    }
}

export default scrapePartifulEvent;
