import axios from 'axios';
import { DateTime } from 'luxon';
import TurndownService from 'turndown';
import { NormalizedEventInput } from '../../commonTypes.js';
import { ScraperParams } from '../types.js';
import { resolveSourceFields } from '../helpers/sourceTracking.js';

const API_URL = 'https://tantrany.com/api/events-listings.json.php?user=toli';
const ORGANIZER_PAGE = 'https://tantrany.com';
const VETTING_URL = 'https://www.tantrany.com/desire/#apply';

interface EventDetails {
    EventId: string;
    ProductId: string;
    EventTitle: string;
    Date: string;
    StartTime: string;
    EventTag: string;
    isOnline: string;
    ImgSrc: string;
    MeetingId: string;
    LocationId: string;
    HostId: string;
    EventBriteId: string;
    URL: string;
    LocationName: string;
    Address1: string;
    Address2: string;
    City: string;
    State: string;
    Zip: string;
    Timezone: string;
    HoursDuration: string;
    RegionDisplayName: string;
    RegionName: string;
    RegionCode: string;
    RelatedRegions: string;
    ImgFile: string;
    ProductAbbr: string;
    ProductName: string;
    ColorHex: string;
    isPublic: string;
    DescShort: string | null;
    EventDataHTMLDescription: string;
    DefaultDuration: string;
    YearMonth: string;
    Day: string;
    Month: string;
    CDate: string;
    Year: string;
}

const parseTimeWithAMPM = (date: string, time: string, timeZone = 'America/New_York') => {
    const startDateTime = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd h:mm a', {
        zone: timeZone,
    });
    if (!startDateTime.isValid) {
        console.error('Invalid date or time format', date, time);
    }
    return startDateTime.toJSDate() || new Date();
};

export const scrapeOrganizerTantraNY = async ({
    url = API_URL,
    eventDefaults,
}: ScraperParams): Promise<NormalizedEventInput[]> => {
    try {
        console.log(`[tantraNY] fetching ${url}`);
        const data = await axios.get(url);
        const sourceFields = resolveSourceFields({
            eventDefaults,
            sourceUrl: url,
            ticketingPlatform: 'Eventbrite',
        });

        const events = Object.values(data.data as EventDetails[]).map((event: EventDetails): NormalizedEventInput => {
            const startDate = parseTimeWithAMPM(event.Date, event.StartTime);
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + parseFloat(event.HoursDuration || event.DefaultDuration));
            const location = `${event.LocationName} - ${event.Address1} ${event.City}, ${event.State} ${event.Zip}`;

            const turndownService = new TurndownService();
            const description = turndownService.turndown(
                turndownService.turndown(event.EventDataHTMLDescription || '')
            );

            const vetted = [4, 11].includes(parseInt(event.ProductId));
            const play_party = event.ProductId === '4';

            return {
                ...eventDefaults,
                ...sourceFields,
                original_id: `organizer-tantra_ny-${event.EventId}`,
                type: 'event',
                recurring: 'none',
                organizer: {
                    name: 'The Tantra Institute',
                    url: ORGANIZER_PAGE,
                },
                name: event.ProductName,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                ticket_url: event.URL,
                event_url: event.URL,
                image_url: event.ImgSrc,
                location,
                price: '',
                description,
                short_description: event.DescShort || '',
                tags: ['tantra'],
                vetted,
                vetting_url: vetted ? VETTING_URL : '',
                play_party,
            };
        });

        return events;
    } catch (error) {
        console.error(error);
        return [];
    }
};

export default scrapeOrganizerTantraNY;
