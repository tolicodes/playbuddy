import puppeteer from 'puppeteer';
import axios from 'axios';

import { Event } from './types';

// Function to scrape event details
const scrapeEventDetails = async (apiUrl: string): Promise<Event[]> => {
    try {
        // Make a request to the Eventbrite API endpoint
        const response = await axios.get(apiUrl);
        const data = response.data;

        // Extract relevant event details
        const events = data.events.map((event: any): Event => ({
            id: event.id,
            name: event.name,
            start_date: event.start_date,
            end_date: event.end_date,
            start_time: event.start_time,
            end_time: event.end_time,
            timezone: event.timezone,
            location: event.primary_venue.address.localized_address_display,
            price: event.ticket_availability.minimum_ticket_price.display,
            imageUrl: event.image.url,
            organizer: event.primary_organizer.name,
            organizerUrl: event.primary_organizer.url,
            eventUrl: event.url,
            summary: event.summary,
            tags: event.tags.map((tag: any) => tag.display_name),
            min_ticket_price: event.ticket_availability.minimum_ticket_price.display,
            max_ticket_price: event.ticket_availability.maximum_ticket_price.display,
            source: 'Eventbrite'
        }));

        return events;
    } catch (error) {
        // Fail silently by returning an empty array
        return [];
    }
};

// Function to scrape organizer page
const scrapeEventbriteOrganizerPage = async (organizerUrl: string): Promise<Event[]> => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        // Listen for the API request
        const apiPromise = new Promise<string>((resolve, reject) => {
            page.on('request', (request) => {
                const url = request.url();
                if (url.includes('https://www.eventbrite.com/api/v3/destination/event')) {
                    resolve(url);
                }
            });
        });

        const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => {
                console.log('Organizer has no events or API request took too long');
                reject(new Error('Organizer has no events or API request took too long'));
            }, 5000);
        });

        await page.goto(organizerUrl, { waitUntil: 'networkidle2' });

        // Wait for the API request URL or timeout
        const apiUrl = await Promise.race([apiPromise, timeoutPromise]);
        console.log('Captured API URL:', apiUrl);

        // Scrape event details using the captured API URL
        const events = await scrapeEventDetails(apiUrl);
        return events;
    } catch (error) {
        // Fail silently by returning an empty array
        return [];
    } finally {
        await browser.close();
    }
};

// Default export function
export default scrapeEventbriteOrganizerPage;
