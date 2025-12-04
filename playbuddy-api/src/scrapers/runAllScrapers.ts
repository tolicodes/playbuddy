import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJob } from './jobQueue.js';
import { scrapePluraEvents } from './plura.js';
import { scrapeOrganizerTantraNY } from './organizers/tantraNY.js';
import { scrapeEventbriteOrganizers } from './eventbriteOrganizers.js';

const ENABLE_PLURA = false;
const ENABLE_TANTRA = false;
const ENABLE_EVENTBRITE = process.env.ENABLE_EVENTBRITE !== 'false';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_EB_LIST = path.resolve(__dirname, '../../data/datasets/kink_eventbrite_organizer_urls.json');
const DEFAULT_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b';

const normalizeTantraUrl = (raw?: string) => {
    if (!raw) return 'https://tantrany.com';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `https://tantrany.com${raw}`;
    if (raw.startsWith('?')) return `https://tantrany.com/${raw}`;
    return `https://tantrany.com/${raw}`;
};

export const runAllScrapers = async (authUserId?: string) => {
    const ebUrls: string[] = JSON.parse(fs.readFileSync(DEFAULT_EB_LIST, 'utf-8'));

    const ebDefaults = {
        source_ticketing_platform: 'Eventbrite' as const,
        dataset: 'Kink' as const,
        communities: [{ id: DEFAULT_COMMUNITY_ID }],
    };

    const pluraDefaults = {
        source_ticketing_platform: 'Plura' as const,
        dataset: 'Kink' as const,
        communities: [{ id: DEFAULT_COMMUNITY_ID }],
    };

    const tantraDefaults = {
        dataset: 'Kink' as const,
        source_origination_platform: 'organizer_api' as const,
    };

    const ebEvents = ENABLE_EVENTBRITE
        ? await scrapeEventbriteOrganizers({ organizerURLs: ebUrls, eventDefaults: ebDefaults })
        : [];

    // Prefetch Plura and TantraNY to create per-record tasks
    const [pluraEvents, tantraEvents] = await Promise.all([
        ENABLE_PLURA ? scrapePluraEvents({ eventDefaults: pluraDefaults }) : Promise.resolve([]),
        ENABLE_TANTRA ? scrapeOrganizerTantraNY({ url: 'https://tantrany.com/api/events-listings.json.php?user=toli', eventDefaults: tantraDefaults }) : Promise.resolve([]),
    ]);

    const ebTasks = ebEvents.map(ev => ({
        url: ev.ticket_url || ev.event_url || ev.original_id || 'eventbrite:event',
        source: 'eventbrite',
        prefetched: [ev],
    }));

    const pluraTasks = pluraEvents.map(ev => ({
        url: ev.ticket_url || ev.event_url || 'plura:event',
        source: 'plura',
        prefetched: [ev],
    }));

    const tantraTasks = tantraEvents.map(ev => ({
        url: normalizeTantraUrl(ev.ticket_url || ev.event_url || ev.original_id || 'tantrany:event'),
        source: 'tantrany.com',
        prefetched: [ev],
    }));

    const tasks = [
        ...ebTasks,
        ...pluraTasks,
        ...tantraTasks,
    ];

    const jobId = await createJob(tasks as any, 5, { authUserId, source: 'all' });
    return { jobId, enqueued: tasks.length };
};

export default runAllScrapers;
