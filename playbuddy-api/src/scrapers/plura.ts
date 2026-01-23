import axios from 'axios';
import TurndownService from 'turndown';
import moment from 'moment-timezone';
import { NormalizedEventInput } from '../commonTypes.js';
import { resolveSourceFields } from './helpers/sourceTracking.js';

const API_URL = 'https://api.joinbloom.community/events?perPage=1000';

const fillInEndTime = (startDateTime: string, endDateTime?: string): string => {
    if (endDateTime) return endDateTime;
    const start = moment(startDateTime);
    return start.add(2, 'hours').toISOString();
};

export const scrapePluraEvents = async ({
    eventDefaults,
}: {
    eventDefaults: Partial<NormalizedEventInput>;
}): Promise<NormalizedEventInput[]> => {
    console.log('[plura] fetching hangouts feed');
    const response = await axios.get(API_URL);
    const data = response.data;

    const turndownService = new TurndownService();
    const sourceFields = resolveSourceFields({
        eventDefaults,
        sourceUrl: API_URL,
        ticketingPlatform: 'Plura',
    });

    return (data.hangouts || [])
        .filter((event: any) => event.location?.city === 'New York' || event.location?.metroId === '109c15cd-ce60-4f7c-b394-8a6d3d3e5526')
        .map((event: any) => {
            const description = turndownService.turndown(event.details || '');
            return {
                ...eventDefaults,
                ...sourceFields,
                original_id: `plura-${event.id}`,
                organizer: {
                    name: event.organization?.name,
                    url: event.organization?.referral?.url,
                },
                name: event.eventName,
                start_date: event.eventStartsAt,
                end_date: fillInEndTime(event.eventStartsAt, event.eventEndsAt),
                ticket_url: event.shareUrl,
                event_url: event.shareUrl,
                image_url: event.image?.urls?.['600x300'],
                location: `${event.location?.address1 || ''} ${event.location?.address2 || ''}, ${event.location?.city}, ${event.location?.region} ${event.location?.postalCode || ''}`.trim(),
                price: '',
                description,
                tags: [],
            } as NormalizedEventInput;
        });
};

export default scrapePluraEvents;
