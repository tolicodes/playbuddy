import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJob } from './jobQueue.js';
import { scrapePluraEvents } from '../plura.js';
import { scrapeOrganizerTantraNY } from '../organizers/tantraNY.js';
import { scrapeEventbriteOrganizers } from '../eventbriteOrganizers.js';

const ENABLE_PLURA = false;
const ENABLE_TANTRA = false;
const ENABLE_EVENTBRITE = process.env.ENABLE_EVENTBRITE !== 'false';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_EB_LIST = path.resolve(__dirname, '../../../data/datasets/kink_eventbrite_organizer_urls.json');
const EXTRA_URLS_LIST = path.resolve(__dirname, '../../../data/datasets/urls.json');
const DEFAULT_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b';

const normalizeTantraUrl = (raw?: string) => {
    if (!raw) return 'https://tantrany.com';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `https://tantrany.com${raw}`;
    if (raw.startsWith('?')) return `https://tantrany.com/${raw}`;
    return `https://tantrany.com/${raw}`;
};

export const runAllScrapers = async (authUserId?: string, opts: { scenario?: string } = {}) => {
    const scenario = opts.scenario || 'all';
    const urlsOnly = scenario === 'urls_json';
    console.log(`[scrapers] runAllScrapers scenario=${scenario} urlsOnly=${urlsOnly}`);

    const ebUrls: string[] = ENABLE_EVENTBRITE ? JSON.parse(fs.readFileSync(DEFAULT_EB_LIST, 'utf-8')) : [];
    const rawExtra = fs.existsSync(EXTRA_URLS_LIST)
        ? JSON.parse(fs.readFileSync(EXTRA_URLS_LIST, 'utf-8'))
        : [];
    const extraUrls: { url: string; multipleEvents?: boolean; extractFromListPage?: boolean; metadata?: Record<string, any> }[] = (rawExtra as any[])
        .map((entry) => (typeof entry === 'string' ? { url: entry } : entry))
        .filter((e) => e?.url);

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

    const includeEB = ENABLE_EVENTBRITE && !urlsOnly;
    const includePlura = ENABLE_PLURA && !urlsOnly;
    const includeTantra = ENABLE_TANTRA && !urlsOnly;
    console.log(`[scrapers] includeEB=${includeEB} includePlura=${includePlura} includeTantra=${includeTantra} extraUrls=${extraUrls.length}`);

    const ebEvents = includeEB
        ? await scrapeEventbriteOrganizers({ organizerURLs: ebUrls, eventDefaults: ebDefaults })
        : [];

    // Prefetch Plura and TantraNY to create per-record tasks
    const [pluraEvents, tantraEvents] = await Promise.all([
        includePlura ? scrapePluraEvents({ eventDefaults: pluraDefaults }) : Promise.resolve([]),
        includeTantra ? scrapeOrganizerTantraNY({ url: 'https://tantrany.com/api/events-listings.json.php?user=toli', eventDefaults: tantraDefaults }) : Promise.resolve([]),
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

    const extraTasks = extraUrls.map(entry => ({
        url: entry.url,
        source: 'auto',
        multipleEvents: !!entry.multipleEvents,
        extractFromListPage: !!entry.extractFromListPage,
        eventDefaults: entry.metadata,
    }));

    const tasks = [
        ...(includeEB ? ebTasks : []),
        ...(includePlura ? pluraTasks : []),
        ...(includeTantra ? tantraTasks : []),
        ...extraTasks,
    ];

    console.log(`[scrapers] prepared tasks: eb=${ebTasks.length} plura=${pluraTasks.length} tantra=${tantraTasks.length} extra=${extraTasks.length} total=${tasks.length}`);

    const jobId = await createJob(tasks as any, 5, { authUserId, source: scenario || 'all' });
    return { jobId, enqueued: tasks.length };
};

export default runAllScrapers;
