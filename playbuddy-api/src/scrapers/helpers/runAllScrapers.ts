import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJob } from './jobQueue.js';
import { scrapePluraEvents } from '../plura.js';
import { scrapeOrganizerTantraNY } from '../organizers/tantraNY.js';
import { scrapeEventbriteOrganizers } from '../eventbriteOrganizers.js';
import { scrapeGmailSources, type GmailSourceConfig } from '../gmail.js';
import { supabaseClient } from '../../connections/supabaseClient.js';
import type { ImportSource } from '../../commonTypes.js';

const ENABLE_PLURA = false;
const ENABLE_TANTRA = false;
const ENABLE_EVENTBRITE = process.env.ENABLE_EVENTBRITE !== 'false';
const ENABLE_GMAIL = process.env.ENABLE_GMAIL !== 'false';
const ENABLE_IMPORT_SOURCES = process.env.ENABLE_IMPORT_SOURCES !== 'false';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_EB_LIST = path.resolve(__dirname, '../../../data/datasets/kink_eventbrite_organizer_urls.json');
const EXTRA_URLS_LIST = path.resolve(__dirname, '../../../data/datasets/urls.json');
const DEFAULT_GMAIL_LIST = path.resolve(__dirname, '../../../data/datasets/gmail_sources.json');
const DEFAULT_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b';

const normalizeTantraUrl = (raw?: string) => {
    if (!raw) return 'https://tantrany.com';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `https://tantrany.com${raw}`;
    if (raw.startsWith('?')) return `https://tantrany.com/${raw}`;
    return `https://tantrany.com/${raw}`;
};

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (!normalized) return undefined;
        if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    }
    return undefined;
};

const asRecord = (value: unknown): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, any>;
};

const mergeEventDefaults = (eventDefaults?: Record<string, any> | null, metadata?: Record<string, any> | null): Record<string, any> => {
    const defaults = asRecord(eventDefaults);
    const meta = asRecord(metadata);
    const organizerDefaults = asRecord(defaults.organizer);
    const organizerMeta = asRecord(meta.organizer);
    return {
        ...defaults,
        ...meta,
        organizer: {
            ...organizerDefaults,
            ...organizerMeta,
        },
    };
};

const normalizeImportSourceUrl = (raw?: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(withScheme);
        if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
            return null;
        }
        return withScheme;
    } catch {
        return null;
    }
};

const isHandleImportSource = (source: ImportSource) => {
    const identifierType = (source.identifier_type || '').toLowerCase();
    const sourceType = (source.source || '').toLowerCase();
    return identifierType === 'handle' || sourceType === 'fetlife_handle';
};

const fetchImportSources = async (): Promise<ImportSource[]> => {
    try {
        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('*');
        if (error) {
            console.error('[scrapers] Failed to fetch import_sources', error);
            return [];
        }
        return (data || []) as ImportSource[];
    } catch (err) {
        console.error('[scrapers] Failed to fetch import_sources', err);
        return [];
    }
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

    const gmailListPath = process.env.GMAIL_SOURCES_LIST
        ? path.resolve(process.cwd(), process.env.GMAIL_SOURCES_LIST)
        : DEFAULT_GMAIL_LIST;
    const rawGmail = fs.existsSync(gmailListPath)
        ? JSON.parse(fs.readFileSync(gmailListPath, 'utf-8'))
        : [];
    const gmailSources: GmailSourceConfig[] = (Array.isArray(rawGmail) ? rawGmail : [rawGmail])
        .map((entry: any) => {
            const rawStatus = typeof entry?.event_status === 'string' ? entry.event_status.toLowerCase() : '';
            const event_status = rawStatus === 'approved' || rawStatus === 'pending' ? rawStatus : undefined;
            return {
                source_email: String(entry?.source_email || '').trim(),
                event_status,
            };
        })
        .filter((entry: GmailSourceConfig) => Boolean(entry.source_email));

    const includeImportSources = ENABLE_IMPORT_SOURCES;
    const importSources = includeImportSources ? await fetchImportSources() : [];
    const importSourceSummary = {
        total: importSources.length,
        excluded: 0,
        rejected: 0,
        handles: 0,
        invalid: 0,
        urls: 0,
    };
    const importSourceTasks = importSources.reduce((acc, source) => {
        const approval = source?.approval_status || null;
        const isExcluded = !!source?.is_excluded;
        if (isExcluded) {
            importSourceSummary.excluded += 1;
        }
        if (approval === 'rejected') {
            importSourceSummary.rejected += 1;
        }
        if (isHandleImportSource(source)) {
            importSourceSummary.handles += 1;
            return acc;
        }
        const url = normalizeImportSourceUrl(source?.identifier || '');
        if (!url) {
            importSourceSummary.invalid += 1;
            return acc;
        }
        const metadata = asRecord(source?.metadata);
        const defaults = asRecord(source?.event_defaults);
        const eventDefaults = mergeEventDefaults(defaults, metadata);
        const eventDefaultsMetadata = asRecord(eventDefaults.metadata);
        const sourceApproval = source?.approval_status ?? null;
        const eventDefaultsWithSource: Record<string, any> = {
            ...eventDefaults,
            metadata: {
                ...eventDefaultsMetadata,
                import_source_id: source.id,
                import_source_identifier: source.identifier,
                import_source_approval_status: sourceApproval,
                import_source_is_excluded: !!source?.is_excluded,
            },
            source_url: eventDefaults.source_url ?? url,
        };
        if (eventDefaultsWithSource.approval_status === undefined || eventDefaultsWithSource.approval_status === null) {
            if (sourceApproval === 'pending') {
                eventDefaultsWithSource.approval_status = 'pending';
            } else if (sourceApproval === 'rejected') {
                eventDefaultsWithSource.approval_status = 'rejected';
            } else {
                eventDefaultsWithSource.approval_status = 'approved';
            }
        }
        const multipleEvents = parseOptionalBoolean(
            metadata.multipleEvents ?? metadata.multiple_events ?? defaults.multipleEvents ?? defaults.multiple_events
        );
        const extractFromListPage = parseOptionalBoolean(
            metadata.extractFromListPage ?? metadata.extract_from_list_page ?? defaults.extractFromListPage ?? defaults.extract_from_list_page
        );
        const task: {
            url: string;
            source?: string;
            multipleEvents?: boolean;
            extractFromListPage?: boolean;
            eventDefaults?: Record<string, any>;
        } = {
            url,
            source: source?.source || 'import_source',
            eventDefaults: eventDefaultsWithSource,
        };
        if (multipleEvents !== undefined) task.multipleEvents = multipleEvents;
        if (extractFromListPage !== undefined) task.extractFromListPage = extractFromListPage;
        acc.push(task);
        importSourceSummary.urls += 1;
        return acc;
    }, [] as Array<{ url: string; source?: string; multipleEvents?: boolean; extractFromListPage?: boolean; eventDefaults?: Record<string, any> }>);

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
    const includeGmail = ENABLE_GMAIL && !urlsOnly && gmailSources.length > 0;
    console.log(`[scrapers] includeEB=${includeEB} includePlura=${includePlura} includeTantra=${includeTantra} includeGmail=${includeGmail} includeImportSources=${includeImportSources} extraUrls=${extraUrls.length} importSources=${importSourceTasks.length}`);
    if (includeImportSources) {
        console.log(`[scrapers] import_sources total=${importSourceSummary.total} urls=${importSourceSummary.urls} handles=${importSourceSummary.handles} excluded=${importSourceSummary.excluded} rejected=${importSourceSummary.rejected} invalid=${importSourceSummary.invalid}`);
    }

    const ebEvents = includeEB
        ? await scrapeEventbriteOrganizers({ organizerURLs: ebUrls, eventDefaults: ebDefaults })
        : [];

    // Prefetch Plura and TantraNY to create per-record tasks
    const [pluraEvents, tantraEvents, gmailEvents] = await Promise.all([
        includePlura ? scrapePluraEvents({ eventDefaults: pluraDefaults }) : Promise.resolve([]),
        includeTantra ? scrapeOrganizerTantraNY({ url: 'https://tantrany.com/api/events-listings.json.php?user=toli', eventDefaults: tantraDefaults }) : Promise.resolve([]),
        includeGmail ? scrapeGmailSources(gmailSources) : Promise.resolve([]),
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

    const gmailTasks = gmailEvents.map((ev, idx) => ({
        url: ev.source_url || ev.ticket_url || ev.event_url || ev.original_id || `gmail:event:${idx}`,
        source: 'gmail',
        prefetched: [ev],
        skipExisting: true,
        skipExistingNoApproval: true,
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
        ...(includeGmail ? gmailTasks : []),
        ...extraTasks,
        ...importSourceTasks,
    ];

    console.log(`[scrapers] prepared tasks: eb=${ebTasks.length} plura=${pluraTasks.length} tantra=${tantraTasks.length} gmail=${gmailTasks.length} extra=${extraTasks.length} importSources=${importSourceTasks.length} total=${tasks.length}`);

    const jobId = await createJob(tasks as any, 5, { authUserId, source: scenario || 'all' });
    return { jobId, enqueued: tasks.length };
};

export default runAllScrapers;
