import { createJob } from './jobQueue.js';
import { scrapePluraEvents } from '../plura.js';
import { scrapeOrganizerTantraNY } from '../organizers/tantraNY.js';
import { scrapeEventbriteOrganizers } from '../eventbriteOrganizers.js';
import { scrapeGmailSources, type GmailSourceConfig } from '../gmail.js';
import { fetchGmailSources } from './gmailSources.js';
import { canonicalizeUrl } from '../ai/normalize.js';
import { supabaseClient } from '../../connections/supabaseClient.js';
import type { ImportSource, NormalizedEventInput } from '../../commonTypes.js';

const ENABLE_PLURA = false;
const ENABLE_TANTRA = false;
const ENABLE_EVENTBRITE = process.env.ENABLE_EVENTBRITE !== 'false';
const ENABLE_GMAIL = process.env.ENABLE_GMAIL !== 'false';
const ENABLE_IMPORT_SOURCES = process.env.ENABLE_IMPORT_SOURCES !== 'false';

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
        const canonical = canonicalizeUrl(withScheme) ?? withScheme;
        const url = new URL(canonical);
        if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
            return null;
        }
        return canonical;
    } catch {
        return null;
    }
};

const isHandleImportSource = (source: ImportSource) => {
    const identifierType = (source.identifier_type || '').toLowerCase();
    const sourceType = (source.source || '').toLowerCase();
    return identifierType === 'handle' || sourceType === 'fetlife_handle';
};

const isGmailImportSource = (source: ImportSource) => {
    const sourceType = (source.source || '').toLowerCase();
    const methodType = (source.method || '').toLowerCase();
    return sourceType === 'gmail' || methodType === 'gmail';
};

const isAiImportSource = (source: ImportSource) => {
    const methodType = (source.method || '').toLowerCase();
    return methodType === 'ai_scraper';
};

const normalizeEventbriteOrganizerUrl = (raw?: string | null): string | null => {
    const url = normalizeImportSourceUrl(raw);
    if (!url) return null;
    if (!/eventbrite\.com\/o\//i.test(url)) return null;
    return url;
};

const buildImportSourceDefaults = (source: ImportSource, sourceUrl: string): Record<string, any> => {
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
        source_url: eventDefaults.source_url ?? sourceUrl,
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
    return eventDefaultsWithSource;
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

    const gmailSources: GmailSourceConfig[] = ENABLE_GMAIL
        ? await fetchGmailSources({ fallbackToFile: false })
        : [];

    const includeEB = ENABLE_EVENTBRITE && !urlsOnly;
    const includeImportSources = ENABLE_IMPORT_SOURCES;
    const importSources = (includeImportSources || includeEB) ? await fetchImportSources() : [];

    const ebDefaults = {
        source_ticketing_platform: 'Eventbrite' as const,
        dataset: 'Kink' as const,
        communities: [{ id: DEFAULT_COMMUNITY_ID }],
    };

    const importSourceSummary = {
        total: importSources.length,
        excluded: 0,
        rejected: 0,
        handles: 0,
        gmail: 0,
        eventbrite: 0,
        invalid: 0,
        urls: 0,
        deduped: 0,
    };
    const eventbriteSources: Array<{ url: string; eventDefaults: Record<string, any> }> = [];
    const importSourceTasks: Array<{ url: string; source?: string; multipleEvents?: boolean; extractFromListPage?: boolean; eventDefaults?: Record<string, any> }> = [];
    const seenAiUrls = new Set<string>();

    importSources.forEach((source) => {
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
            return;
        }
        if (isGmailImportSource(source)) {
            importSourceSummary.gmail += 1;
            return;
        }

        const eventbriteUrl = normalizeEventbriteOrganizerUrl(source?.identifier || '');
        if (eventbriteUrl) {
            importSourceSummary.eventbrite += 1;
            if (includeEB) {
                const eventDefaultsWithSource = buildImportSourceDefaults(source, eventbriteUrl);
                const mergedDefaults = mergeEventDefaults(ebDefaults as any, eventDefaultsWithSource as any);
                eventbriteSources.push({ url: eventbriteUrl, eventDefaults: mergedDefaults });
            }
            return;
        }

        const url = normalizeImportSourceUrl(source?.identifier || '');
        if (!url) {
            importSourceSummary.invalid += 1;
            return;
        }
        if (!includeImportSources) return;
        if (isAiImportSource(source)) {
            const dedupeKey = url.toLowerCase();
            if (seenAiUrls.has(dedupeKey)) {
                importSourceSummary.deduped += 1;
                return;
            }
            seenAiUrls.add(dedupeKey);
        }

        const metadata = asRecord(source?.metadata);
        const defaults = asRecord(source?.event_defaults);
        const eventDefaultsWithSource = buildImportSourceDefaults(source, url);
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
        importSourceTasks.push(task);
        importSourceSummary.urls += 1;
    });

    const pluraDefaults = {
        source_ticketing_platform: 'Plura' as const,
        dataset: 'Kink' as const,
        communities: [{ id: DEFAULT_COMMUNITY_ID }],
    };

    const tantraDefaults = {
        dataset: 'Kink' as const,
        source_origination_platform: 'organizer_api' as const,
    };

    const includePlura = ENABLE_PLURA && !urlsOnly;
    const includeTantra = ENABLE_TANTRA && !urlsOnly;
    const includeGmail = ENABLE_GMAIL && !urlsOnly && gmailSources.length > 0;
    console.log(`[scrapers] includeEB=${includeEB} includePlura=${includePlura} includeTantra=${includeTantra} includeGmail=${includeGmail} includeImportSources=${includeImportSources} importSources=${importSourceTasks.length}`);
    if (includeImportSources) {
        console.log(`[scrapers] import_sources total=${importSourceSummary.total} urls=${importSourceSummary.urls} handles=${importSourceSummary.handles} gmail=${importSourceSummary.gmail} eventbrite=${importSourceSummary.eventbrite} excluded=${importSourceSummary.excluded} rejected=${importSourceSummary.rejected} invalid=${importSourceSummary.invalid} deduped=${importSourceSummary.deduped}`);
    }

    const ebEvents = includeEB
        ? (await Promise.allSettled(
            eventbriteSources.map(({ url, eventDefaults }) =>
                scrapeEventbriteOrganizers({ organizerURLs: [url], eventDefaults })
            )
        ))
            .filter((result): result is PromiseFulfilledResult<NormalizedEventInput[]> => result.status === 'fulfilled')
            .flatMap((result) => result.value)
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

    const gmailSkipExistingByEmail = new Map(
        gmailSources.map((source) => [
            source.source_email.trim().toLowerCase(),
            typeof source.skip_existing === 'boolean' ? source.skip_existing : true,
        ])
    );
    const gmailTasks = gmailEvents.map((ev, idx) => {
        const sourceUrl = (ev.source_url || '').toString();
        const emailKey = sourceUrl.toLowerCase().startsWith('gmail:')
            ? sourceUrl.slice('gmail:'.length).trim().toLowerCase()
            : '';
        const skipExisting = emailKey ? (gmailSkipExistingByEmail.get(emailKey) ?? true) : true;
        return {
            url: ev.source_url || ev.ticket_url || ev.event_url || ev.original_id || `gmail:event:${idx}`,
            source: 'gmail',
            prefetched: [ev],
            ...(skipExisting ? { skipExisting: true, skipExistingNoApproval: true } : {}),
        };
    });

    const tasks = [
        ...(includeEB ? ebTasks : []),
        ...(includePlura ? pluraTasks : []),
        ...(includeTantra ? tantraTasks : []),
        ...(includeGmail ? gmailTasks : []),
        ...importSourceTasks,
    ];

    console.log(`[scrapers] prepared tasks: eb=${ebTasks.length} plura=${pluraTasks.length} tantra=${tantraTasks.length} gmail=${gmailTasks.length} importSources=${importSourceTasks.length} total=${tasks.length}`);

    const jobId = await createJob(tasks as any, 5, { authUserId, source: scenario || 'all' });
    return { jobId, enqueued: tasks.length };
};

export default runAllScrapers;
