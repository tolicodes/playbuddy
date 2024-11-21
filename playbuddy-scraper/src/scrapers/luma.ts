import axios from "axios";
import TurndownService from 'turndown';

import { ScraperParams } from "../types.js";
import { CreateEventInput, SourceMetadata } from "../../commonTypes.js";

const getApiUrlFromPage = (pageUrl: string) => {
    // Create a URL object
    const urlObj = new URL(pageUrl);

    // Extract the values
    const pathValue = urlObj.pathname.split('/')[1]; // Extracts 'legeyh1e'
    const ticketKey = urlObj.searchParams.get('tk'); // Extracts 'miJO9Z'

    // Build the API URL
    const apiUrl = `https://api.lu.ma/url?url=${pathValue}&referring_ticket_key=${ticketKey}`;

    return apiUrl;
}

function parseDescriptionToMarkdown(descriptionMirror: any): string {
    if (!descriptionMirror || !descriptionMirror.content) {
        return '';
    }

    return descriptionMirror.content
        .map((block: any) => {
            // Handle different block types
            switch (block.type) {
                case 'paragraph':
                    return block.content?.map((item: any) => item.text).join('');
                case 'bullet_list':
                    return block.content
                        ?.map(
                            (listItem: any) =>
                                `- ${listItem.content
                                    ?.map((item: any) => item.text)
                                    .join('')}`
                        )
                        .join('\n');
                case 'horizontal_rule':
                    return '---';
                case 'heading':
                    return `## ${block.content?.map((item: any) => item.text).join('')}`;
                default:
                    // Default to plain text for unknown blocks
                    return block.content
                        ?.map((item: any) => item.text)
                        .join('');
            }
        })
        .join('\n\n'); // Join blocks with two newlines for better Markdown readability
}


function transformToStandardFormat(apiResponse: any, sourceMetadata: SourceMetadata): CreateEventInput {
    const event = apiResponse.data.event;
    const calendar = apiResponse.data.calendar;

    // Extracting event details
    const transformedEvent: CreateEventInput = {
        original_id: event.api_id,
        name: event.name,
        start_date: event.start_at,
        end_date: event.end_at,
        ticket_url: `https://lu.ma/${event.url}`,
        image_url: event.cover_url,
        event_url: `https://lu.ma/${event.url}`,
        location: event.geo_address_info?.full_address || "Unknown location",
        price: event.ticket_info?.is_free ? "Free" : `$${event.ticket_info?.price || "TBD"}`,
        description: parseDescriptionToMarkdown(apiResponse.data.description_mirror),
        tags: apiResponse.data.categories.map((cat: any) => cat.name),
        type: "event",
        recurring: "none",
        lat: parseFloat(event.geo_latitude) || undefined,
        lon: parseFloat(event.geo_longitude) || undefined,

        // Organizer
        organizer: {
            original_id: calendar.api_id,
            name: calendar.name,
            url: `https://lu.ma/${calendar.slug}`,
        },

        communities: sourceMetadata.communities || [],

        // Location area
        // Generalize this
        location_area: {
            code: 'NYC',
            name: 'New York City',
        },

        source_url: `https://lu.ma/${event.url}`,
        timestamp_scraped: new Date().toISOString(),
        dataset: "Conscious Touch",
        source_origination_platform: "lu.ma",
        source_ticketing_platform: "lu.ma",
    };

    return transformedEvent;
}


const scrapeLumaEventFromPage = async ({
    url,
    sourceMetadata,
}: ScraperParams): Promise<CreateEventInput[]> => {
    try {

        // Construct the endpoint URL
        const endpointUrl = getApiUrlFromPage(url);

        // Fetch data from the endpoint
        const response = await axios.get(endpointUrl);

        if (response.status !== 200) {
            console.error(`Failed to fetch data from endpoint: ${endpointUrl}`);
            return [];
        }

        return [transformToStandardFormat(response.data, sourceMetadata)];
    } catch (error) {
        console.error(`Error scraping Eventbrite events from organizer page`, error);
        return [];
    }
}

export default scrapeLumaEventFromPage;
