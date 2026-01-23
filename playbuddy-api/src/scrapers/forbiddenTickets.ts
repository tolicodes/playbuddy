import axios from 'axios';
import TurndownService from 'turndown';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import { ScraperParams } from './types.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { EventTypes } from '../common/types/commonTypes.js';
import { resolveSourceFields } from './helpers/sourceTracking.js';

const turndown = new TurndownService();

export const scrapeForbiddenTicketsEvent = async ({ url, eventDefaults }: ScraperParams): Promise<NormalizedEventInput[]> => {
    console.log(`[forbidden-tickets] fetching ${url}`);
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const eventId = url.split('/').pop() || '';

    // Event name and image
    const name = $('h1').first().text().trim();
    const image_url = $('.swiper-slide img').first().attr('src');

    // Description in Markdown
    const rawHtml = $('.prose .m-8').html();
    const description = rawHtml ? turndown.turndown(rawHtml) : '';

    // Location
    const location = $('td:contains("Location")').next().text().trim();

    // Category
    const category = $('td:contains("Category")').next().text().trim();

    // Producer / Organizer
    const producerEl = $('td:contains("Producer")').next();
    const organizer = {
        name: producerEl.text().trim(),
        url: producerEl.find('a').attr('href')?.trim()
    };

    // Parse datetime
    const rawTime = $('td:contains("Time")').next().text().trim();
    const timeMatch = rawTime.match(/(\w+ \d+(st|nd|rd|th) of \w+ \d{4}), (\d{1,2}:\d{2} [ap]m)–(\d{1,2}:\d{2} [ap]m)/i);
    let start_date = null;
    let end_date = null;

    if (timeMatch) {
        const [, datePart, , startTime, endTime] = timeMatch;
        const startDateTime = DateTime.fromFormat(`${datePart} ${startTime}`, "cccc d'th' 'of' LLLL yyyy h:mm a", { zone: 'America/New_York' });
        const endDateTime = DateTime.fromFormat(`${datePart} ${endTime}`, "cccc d'th' 'of' LLLL yyyy h:mm a", { zone: 'America/New_York' });

        start_date = startDateTime.isValid ? startDateTime.toUTC().toISO() : null;
        end_date = endDateTime.isValid ? endDateTime.toUTC().toISO() : null;
    }

    if (!start_date || !end_date) {
        console.error(`No start or end date found for event: ${url}`)
        return [];
    }

    // Price (get minimum ticket price)
    const prices = $('[x-data*="pricePerTicket"]').map((_, el) => {
        const priceText = $(el).find('.text-lg').text();
        const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
        return price || null;
    }).get().filter(p => typeof p === 'number');

    const price = prices.length ? Math.min(...prices) : 0;
    const sourceFields = resolveSourceFields({
        eventDefaults,
        sourceUrl: url,
        ticketingPlatform: "Forbidden Tickets",
    });

    return [{
        ...eventDefaults,
        ...sourceFields,
        original_id: `forbidden-tickets-${eventId}`,
        ticket_url: url,
        name,
        type: 'event' as EventTypes,
        start_date,
        end_date,
        organizer,
        description,
        image_url,
        price: String(price),
        location,
        tags: [category],
    }];
};
