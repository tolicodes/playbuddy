import { CreateEventInput, SourceMetadata } from "../commonTypes.js";
import { ScraperParams } from './types.js';
import { ApifyClient } from 'apify-client';
import { FacebookEventApifyResponse } from './fbTypes.js';


// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: process.env.APIFY_ACCESS_TOKEN
});

const searchQueries = [
    'acro festival',
    'acro retreat',
];

// Prepare Actor input
const input = {
    "searchQueries": searchQueries,
    // "startUrls": getEventUrls(),
    "maxEvents": 100
};

const ACTOR_ID = "UZBnerCFBo5FgGouO";

async function mapFacebookEventToEvent(facebookEvent: FacebookEventApifyResponse, sourceMetadata: SourceMetadata): Promise<CreateEventInput> {
    return {
        original_id: facebookEvent.id,

        name: facebookEvent.name,
        start_date: facebookEvent.utcStartDate || '',
        end_date: facebookEvent.utcEndDate || '',
        ticket_url: facebookEvent.externalLinks?.[0] || '',
        image_url: facebookEvent.imageUrl || '',
        event_url: facebookEvent.url || '',
        location: facebookEvent.location?.name || '',
        price: '',
        description: facebookEvent.description || '',
        tags: [],
        type: 'retreat',
        recurring: 'none',
        lat: facebookEvent.location?.latitude || undefined,
        lon: facebookEvent.location?.longitude || undefined,

        organizer: {
            original_id: facebookEvent.organizators[0]?.id || '',
            name: facebookEvent.organizators[0]?.name || '',
            url: facebookEvent.organizators[0]?.url || '',
        },
        location_area: {
            code: facebookEvent.location?.countryCode || '',
        },

        //includes community
        ...sourceMetadata,

        communities: sourceMetadata.communities,

        source_url: facebookEvent.url || '',
        dataset: 'Acro',
        source_origination_platform: 'facebook',

        metadata: {
            duration: facebookEvent.duration || '',
        }
    };
}

export const scrapeFacebookEvents = async ({
    sourceMetadata,
}: ScraperParams): Promise<CreateEventInput[]> => {
    try {
        // Run the Actor and wait for it to finish
        const run = await client.actor(ACTOR_ID).call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Map the raw Facebook events to our Event format
        const events: CreateEventInput[] = await Promise.all(
            (items as FacebookEventApifyResponse[]).map((item) => mapFacebookEventToEvent(item, sourceMetadata))
        );

        console.log('Got events from scraper', events);

        return events;
    } catch (error) {
        console.error('Error scraping Facebook events:', error);
        return [];
    }
};