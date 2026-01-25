import { Router, Response, Request } from 'express';
import PQueue from 'p-queue';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { createJob, getJob, listJobs } from '../scrapers/helpers/jobQueue.js';
import runAllScrapers from '../scrapers/helpers/runAllScrapers.js';
import { startBranchStatsScrape } from './branch_stats.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import scrapeURLs from '../scrapers/helpers/scrapeURLs.js';
import { upsertEvent } from './helpers/writeEventsToDB/upsertEvent.js';
import { flushEvents } from '../helpers/flushCache.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { classifyEventsInBatches } from '../scripts/event-classifier/classifyEvents.js';
import { scrapeGmailSources, type GmailSourceConfig } from '../scrapers/gmail.js';
import { replayToLargeInstance } from '../middleware/replayToLargeInstance.js';
import { fetchGmailSources, normalizeGmailSources } from '../scrapers/helpers/gmailSources.js';
import { fetchTicketingSources } from '../scrapers/helpers/ticketingSources.js';
import { canonicalizeUrl } from '../scrapers/ai/normalize.js';
import { logScrapeReport } from '../scrapers/helpers/scrapeReport.js';
import type { HtmlScrapeCapture } from '../scrapers/helpers/htmlScrapeStore.js';
import type { ScrapeSkipReason } from '../scrapers/types.js';
import { subscribeScrapeJobStream } from '../scrapers/helpers/scrapeJobStream.js';

const router = Router();
const UPSERT_CONCURRENCY = Number(process.env.SCRAPE_UPSERT_CONCURRENCY || 40);

const parseSyncFlag = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ['1', 'true', 'yes', 'y', 'sync'].includes(normalized);
};

const resolveImportMode = (req: AuthenticatedRequest) => {
    const rawMode = req.query?.mode ?? req.body?.mode;
    if (typeof rawMode === 'string') {
        const normalized = rawMode.trim().toLowerCase();
        if (normalized === 'sync' || normalized === 'async') return normalized;
    }
    const syncFlag = parseSyncFlag(req.query?.sync ?? req.body?.sync);
    return syncFlag ? 'sync' : 'async';
};

const buildHtmlCapture = (source: string, ref?: string | number | null): HtmlScrapeCapture => ({
    source,
    ref: ref !== undefined && ref !== null ? String(ref) : undefined,
});

const loadScrapeJobsWithTasks = async (limit = 3) => {
    const { data: jobs, error: jobsErr } = await supabaseClient
        .from('scrape_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (jobsErr) {
        throw new Error(jobsErr.message);
    }

    const jobIds = (jobs || []).map((j: any) => j.id);
    let tasks: any[] = [];
    if (jobIds.length > 0) {
        const { data: t, error: tasksErr } = await supabaseClient
            .from('scrape_tasks')
            .select('*')
            .in('job_id', jobIds);
        if (tasksErr) {
            throw new Error(tasksErr.message);
        }
        tasks = t || [];
    }

    return (jobs || []).map((job: any) => ({
        ...job,
        tasks: tasks.filter((t: any) => t.job_id === job.id),
        result: (() => {
            const summary = { inserted: 0, updated: 0, failed: 0 };
            tasks.forEach((t: any) => {
                if (t.job_id !== job.id) return;
                if (t.result?.inserted) summary.inserted += 1;
                if (t.result?.updated) summary.updated += 1;
                if (t.result?.failed || t.status === 'failed') summary.failed += 1;
            });
            return summary;
        })(),
    }));
};

const hydrateAuthHeaderFromQuery = (req: Request, _res: Response, next: any) => {
    if (!req.headers.authorization && typeof req.query?.token === 'string') {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
};

const resolveGmailSkipExisting = (source?: GmailSourceConfig | null) =>
    typeof source?.skip_existing === 'boolean' ? source.skip_existing : true;

const buildGmailTasks = (
    gmailEvents: NormalizedEventInput[],
    skipExistingByEmail?: Map<string, boolean>
) => (
    gmailEvents.map((ev, idx) => {
        const sourceUrl = (ev.source_url || '').toString();
        const emailKey = sourceUrl.toLowerCase().startsWith('gmail:')
            ? sourceUrl.slice('gmail:'.length).trim().toLowerCase()
            : '';
        const skipExisting = emailKey && skipExistingByEmail
            ? (skipExistingByEmail.get(emailKey) ?? true)
            : true;
        return {
            url: ev.source_url || ev.ticket_url || ev.event_url || ev.original_id || `gmail:event:${idx}`,
            source: 'gmail',
            prefetched: [ev],
            ...(skipExisting ? { skipExisting: true, skipExistingNoApproval: true } : {}),
        };
    })
);

const isGmailImportSource = (source: any) => {
    const sourceType = (source?.source || '').toLowerCase();
    const methodType = (source?.method || '').toLowerCase();
    return sourceType === 'gmail' || methodType === 'gmail';
};

const buildGmailSourceConfig = (source: any): GmailSourceConfig | null => {
    const normalized = normalizeGmailSources(source ? [source] : []);
    return normalized.length ? normalized[0] : null;
};

const runSingleGmailScrape = async (args: {
    gmailConfig: GmailSourceConfig;
    mode: 'sync' | 'async';
    maxResults?: number;
    authUserId?: string;
    sourceId?: string;
    jobMetadata?: Record<string, any>;
}) => {
    const gmailEvents = await scrapeGmailSources([args.gmailConfig], { maxResults: args.maxResults });

    if (args.mode === 'async') {
        const skipExistingByEmail = new Map<string, boolean>();
        const sourceEmail = args.gmailConfig.source_email?.trim().toLowerCase();
        if (sourceEmail) {
            skipExistingByEmail.set(sourceEmail, resolveGmailSkipExisting(args.gmailConfig));
        }
        const gmailTasks = buildGmailTasks(gmailEvents, skipExistingByEmail);
        const jobId = await createJob(gmailTasks as any, 5, {
            authUserId: args.authUserId,
            source: 'gmail',
            metadata: args.jobMetadata,
        });
        return {
            mode: args.mode,
            jobId,
            enqueued: gmailTasks.length,
            sourceId: args.sourceId,
            sources: 1,
        };
    }

    const skipExisting = resolveGmailSkipExisting(args.gmailConfig);
    const { results, finalEvents, counts, skipped } = await upsertScrapedEvents(gmailEvents, args.authUserId, {
        ...(skipExisting ? { skipExisting: true, skipExistingNoApproval: true } : {}),
    });
    return {
        mode: args.mode,
        sourceId: args.sourceId,
        scraped: gmailEvents.length,
        counts,
        events: results,
        finalEvents,
        skipped: skipped.length ? skipped : undefined,
    };
};

const mergeEventDefaults = (
    eventDefaults: Partial<NormalizedEventInput>,
    metadata?: Partial<NormalizedEventInput> | null
) => ({
    ...eventDefaults,
    ...(metadata || {}),
    organizer: {
        ...(eventDefaults.organizer || {}),
        ...((metadata as any)?.organizer || {}),
    },
});

const resolveEventUrl = (event?: Partial<NormalizedEventInput> | null): string => {
    if (!event) return '';
    const pick = (value: unknown) => {
        if (typeof value === 'string') return value.trim();
        if (value === null || value === undefined) return '';
        return String(value).trim();
    };
    const candidates = [
        pick((event as any).source_url),
        pick((event as any).ticket_url),
        pick((event as any).event_url),
        pick((event as any).original_id),
    ].filter(Boolean);
    return candidates[0] || '';
};

const buildUpsertSkip = (
    event: NormalizedEventInput | undefined,
    result: any
): ScrapeSkipReason | null => {
    if (!result || result.result !== 'skipped') return null;
    const skip = result.skip || {};
    const url = resolveEventUrl(event) || resolveEventUrl(result.event) || 'unknown';
    return {
        url,
        reason: skip.reason || 'Event skipped during import',
        ...(skip.detail ? { detail: skip.detail } : {}),
        source: skip.source || 'upsert',
        stage: 'upsert',
        ...(event?.name ? { eventName: event.name } : {}),
        ...(skip.eventId ? { eventId: String(skip.eventId) } : {}),
    };
};

type UpsertScrapeOptions = {
    skipExisting?: boolean;
    skipExistingNoApproval?: boolean;
    approveExisting?: boolean;
    ignoreFrozen?: boolean;
};

const upsertScrapedEvents = async (
    scraped: NormalizedEventInput[],
    authUserId?: string,
    opts: UpsertScrapeOptions = {}
) => {
    const results: any[] = new Array(scraped.length);
    const eventIds: (string | number)[] = [];
    const upsertQueue = new PQueue({ concurrency: UPSERT_CONCURRENCY });

    await Promise.all(
        scraped.map((ev, index) =>
            upsertQueue.add(async () => {
                try {
                    const upsertRes = await upsertEvent(ev, authUserId, opts);
                    results[index] = upsertRes;
                    if (upsertRes.event?.id) eventIds.push(upsertRes.event.id);
                } catch (err: any) {
                    results[index] = { result: 'failed', event: null, error: err?.message || String(err) };
                }
            })
        )
    );

    const finalResults = results.map((res) => res ?? { result: 'failed', event: null, error: 'Missing result' });
    const upsertSkipped: ScrapeSkipReason[] = [];
    finalResults.forEach((res, index) => {
        const entry = buildUpsertSkip(scraped[index], res);
        if (entry) upsertSkipped.push(entry);
    });

    await flushEvents();
    await classifyEventsInBatches();

    let finalEvents: any[] = [];
    if (eventIds.length) {
        const { data, error } = await supabaseClient
            .from('events')
            .select('*')
            .in('id', eventIds);
        if (!error && data) {
            finalEvents = data;
        } else {
            console.error('Failed to fetch final events after classification', error);
        }
    }

    const counts = finalResults.reduce(
        (acc, r: any) => {
            if (r.result === 'inserted') acc.inserted += 1;
            else if (r.result === 'updated') acc.updated += 1;
            else if (r.result === 'skipped') acc.skipped += 1;
            else acc.failed += 1;
            acc.total += 1;
            return acc;
        },
        { inserted: 0, updated: 0, failed: 0, skipped: 0, total: 0 }
    );

    logScrapeReport({
        scope: 'sync',
        scraped: scraped.length,
        inserted: counts.inserted,
        updated: counts.updated,
        failed: counts.failed,
    });

    return { results: finalResults, finalEvents, counts: { ...counts, upserted: counts.updated }, skipped: upsertSkipped };
};

type ImportSourceTask = {
    url: string;
    source?: string;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
    eventDefaults?: Record<string, any>;
    captureHtml?: HtmlScrapeCapture;
};

const asRecord = (value: unknown): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, any>;
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

const isHandleImportSource = (source: any) => {
    const identifierType = (source?.identifier_type || '').toLowerCase();
    const sourceType = (source?.source || '').toLowerCase();
    return identifierType === 'handle' || sourceType === 'fetlife_handle';
};

const buildImportSourceTask = (source: any): { task?: ImportSourceTask; error?: string } => {
    if (!source) return { error: 'import_source is required' };
    if (isHandleImportSource(source)) {
        return { error: 'Handle sources are not supported by the server scraper.' };
    }
    const url = normalizeImportSourceUrl(source?.identifier || '');
    if (!url) return { error: 'Import source has an invalid URL.' };

    const metadata = asRecord(source?.metadata);
    const defaults = asRecord(source?.event_defaults);
    const eventDefaults = mergeEventDefaults(defaults as any, metadata as any);
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

    const task: ImportSourceTask = {
        url,
        source: source?.source || 'import_source',
        eventDefaults: eventDefaultsWithSource,
        captureHtml: buildHtmlCapture('import_source', source?.id),
    };
    if (multipleEvents !== undefined) task.multipleEvents = multipleEvents;
    if (extractFromListPage !== undefined) task.extractFromListPage = extractFromListPage;
    return { task };
};

// Run all scrapers (Eventbrite organizers, Plura, TantraNY) and enqueue
router.post('/scrape', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    try {
        const scenario = req.query.scenario?.toString();
        const { jobId, enqueued } = await runAllScrapers(req.authUserId, { scenario });
        const branchStatsResult = startBranchStatsScrape();
        if (!branchStatsResult.ok && branchStatsResult.statusCode !== 409) {
            console.warn('[scrape] branch stats failed to start', {
                statusCode: branchStatsResult.statusCode,
                error: branchStatsResult.error,
            });
        }
        res.json({
            jobId,
            enqueued,
            scenario: scenario || 'all',
            branchStats: branchStatsResult.ok
                ? { status: branchStatsResult.state.status, startedAt: branchStatsResult.state.startedAt }
                : { status: branchStatsResult.state.status, error: branchStatsResult.error, statusCode: branchStatsResult.statusCode },
        });
    } catch (err: any) {
        console.error('Error scraping all sources', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape sources' });
    }
});

// Scrape URL import_sources only (AI/auto routes)
router.post('/scrape-ai-urls', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    try {
        const { jobId, enqueued } = await runAllScrapers(req.authUserId, { scenario: 'urls_json' });
        res.json({ jobId, enqueued, scenario: 'urls_json' });
    } catch (err: any) {
        console.error('Error scraping URL import sources', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape URL import sources' });
    }
});

router.get('/ticketing-sources', authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const sources = await fetchTicketingSources();
        res.json({ sources });
    } catch (err: any) {
        console.error('Failed to fetch ticketing sources', err);
        res.status(500).json({ error: err?.message || 'Failed to fetch ticketing sources' });
    }
});

router.post('/scrape-gmail', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    try {
        const { sources, maxResults } = req.body || {};
        let gmailSources: GmailSourceConfig[] = [];

        if (Array.isArray(sources) && sources.length) {
            gmailSources = normalizeGmailSources(sources);
        } else {
            gmailSources = await fetchGmailSources({ fallbackToFile: true });
        }

        if (!gmailSources.length) {
            res.status(400).json({ error: 'sources is required (array) or configure import_sources with source/method gmail (or set GMAIL_SOURCES_LIST)' });
            return;
        }

        const gmailEvents = await scrapeGmailSources(gmailSources, { maxResults });
        const skipExistingByEmail = new Map<string, boolean>(
            gmailSources
                .map((source) => [source.source_email.trim().toLowerCase(), resolveGmailSkipExisting(source)] as const)
        );
        const gmailTasks = buildGmailTasks(gmailEvents, skipExistingByEmail);

        const jobId = await createJob(gmailTasks as any, 5, { authUserId: req.authUserId, source: 'gmail' });
        res.json({
            jobId,
            enqueued: gmailTasks.length,
            sources: gmailSources.length,
        });
    } catch (err: any) {
        console.error('Error scraping Gmail sources', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape Gmail sources' });
    }
});

router.post('/scrape-gmail-source/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    try {
        const { data: source, error } = await supabaseClient
            .from('import_sources')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('Failed to fetch import_source for gmail', error);
            res.status(500).json({ error: error.message });
            return;
        }

        if (!source) {
            res.status(404).json({ error: 'import_source not found' });
            return;
        }

        if (!isGmailImportSource(source)) {
            res.status(400).json({ error: 'import_source is not a gmail source' });
            return;
        }

        const mode = resolveImportMode(req);
        const { maxResults } = req.body || {};
        const gmailConfig = buildGmailSourceConfig(source);
        if (!gmailConfig?.source_email) {
            res.status(400).json({ error: 'gmail source is missing an identifier' });
            return;
        }

        const response = await runSingleGmailScrape({
            gmailConfig,
            mode,
            maxResults,
            authUserId: req.authUserId,
            sourceId: String(source.id),
            jobMetadata: { import_source_id: source.id },
        });
        res.json(response);
    } catch (err: any) {
        console.error('Error scraping Gmail source', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape Gmail source' });
    }
});

router.post('/scrape-import-source/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    try {
        const { data: source, error } = await supabaseClient
            .from('import_sources')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('Failed to fetch import_source', error);
            res.status(500).json({ error: error.message });
            return;
        }

        if (!source) {
            res.status(404).json({ error: 'import_source not found' });
            return;
        }

        if (isGmailImportSource(source)) {
            const mode = resolveImportMode(req);
            const { maxResults } = req.body || {};
            const gmailConfig = buildGmailSourceConfig(source);
            if (!gmailConfig?.source_email) {
                res.status(400).json({ error: 'gmail source is missing an identifier' });
                return;
            }
            const response = await runSingleGmailScrape({
                gmailConfig,
                mode,
                maxResults,
                authUserId: req.authUserId,
                sourceId: String(source.id),
                jobMetadata: { import_source_id: source.id },
            });
            res.json(response);
            return;
        }

        const { task, error: taskError } = buildImportSourceTask(source);
        if (!task) {
            res.status(400).json({ error: taskError || 'import_source is not scrapeable' });
            return;
        }

        const mode = resolveImportMode(req);
        if (mode === 'async') {
            const jobId = await createJob([task], 5, {
                authUserId: req.authUserId,
                source: 'import_source',
                metadata: { import_source_id: source.id },
            });
            res.json({
                mode,
                jobId,
                enqueued: 1,
                sourceId: String(source.id),
                url: task.url,
            });
            return;
        }

        const scrapeSkipped: ScrapeSkipReason[] = [];
        const scraped = await scrapeURLs(
            [{ url: task.url, multipleEvents: task.multipleEvents, extractFromListPage: task.extractFromListPage }],
            task.eventDefaults,
            {
                onSkip: (skip) => scrapeSkipped.push({ ...skip, stage: 'scrape' }),
                captureHtml: task.captureHtml,
            }
        );
        const { results, finalEvents, counts, skipped: upsertSkipped } = await upsertScrapedEvents(scraped, req.authUserId);
        const skipped = [...scrapeSkipped, ...upsertSkipped];
        res.json({
            mode,
            sourceId: String(source.id),
            url: task.url,
            scraped: scraped.length,
            counts,
            events: results,
            finalEvents,
            skipped: skipped.length ? skipped : undefined,
        });
    } catch (err: any) {
        console.error('Error scraping import_source', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape import_source' });
    }
});

router.post('/import-urls', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
        const { urls, eventDefaults = {} } = req.body || {};
        if (!Array.isArray(urls) || urls.length === 0) {
            res.status(400).json({ error: 'urls (array) is required' });
            return;
        }
    try {
        const mode = resolveImportMode(req);
        if (mode === 'async') {
            const captureHtml = buildHtmlCapture('import_urls');
            const tasks = urls
                .map((input: any) => (typeof input === 'string' ? { url: input } : input))
                .filter((input: any) => typeof input?.url === 'string' && input.url.trim().length > 0)
                .map((input: any) => ({
                    url: input.url,
                    multipleEvents: input.multipleEvents,
                    extractFromListPage: input.extractFromListPage,
                    eventDefaults: mergeEventDefaults(eventDefaults, input.metadata),
                    captureHtml,
                }));
            if (!tasks.length) {
                res.status(400).json({ error: 'urls (array) is required' });
                return;
            }
            const jobId = await createJob(tasks as any, 5, { authUserId: req.authUserId, source: 'import_urls' });
            res.json({
                mode,
                jobId,
                requested: urls.length,
                enqueued: tasks.length,
            });
            return;
        }

        const scrapeSkipped: ScrapeSkipReason[] = [];
        const scraped: NormalizedEventInput[] = await scrapeURLs(
            urls as any[],
            eventDefaults,
            {
                onSkip: (skip) => scrapeSkipped.push({ ...skip, stage: 'scrape' }),
                captureHtml: buildHtmlCapture('import_urls'),
            }
        );
        const { results, finalEvents, counts, skipped: upsertSkipped } = await upsertScrapedEvents(scraped, req.authUserId);
        const skipped = [...scrapeSkipped, ...upsertSkipped];

        res.json({
            mode,
            requested: urls.length,
            scraped: scraped.length,
            counts,
            events: results,
            finalEvents,
            skipped: skipped.length ? skipped : undefined,
        });
    } catch (err: any) {
        console.error('Failed to scrape/import URLs', err);
        res.status(500).json({ error: err?.message || 'failed to import urls' });
    }
});

router.get('/import-urls/:jobId', authenticateAdminRequest, (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;
    getJob(jobId).then(payload => {
        if (!payload) {
            res.status(404).json({ error: 'job not found' });
            return;
        }
        res.json(payload);
    }).catch(err => {
        console.error('Failed to fetch job', err);
        res.status(500).json({ error: 'failed to fetch job' });
    });
});

router.get('/import-urls', authenticateAdminRequest, (_req: AuthenticatedRequest, res: Response) => {
    listJobs().then(jobs => res.json({ jobs })).catch(err => {
        console.error('Failed to list jobs', err);
        res.status(500).json({ error: 'failed to list jobs' });
    });
});

router.get('/scrape-jobs/stream', hydrateAuthHeaderFromQuery, authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writeEvent = (event: string, payload: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    let closed = false;
    const unsubscribe = subscribeScrapeJobStream((event) => {
        if (closed) return;
        writeEvent(event.type, event.payload);
    });

    const heartbeat = setInterval(() => {
        if (closed) return;
        res.write('event: ping\ndata: {}\n\n');
    }, 25000);

    try {
        const jobs = await loadScrapeJobsWithTasks();
        writeEvent('snapshot', { jobs });
    } catch (err: any) {
        writeEvent('error', { error: err?.message || 'failed to load jobs' });
    }

    req.on('close', () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
    });
});

// Jobs + tasks in one payload
router.get('/scrape-jobs', authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const jobs = await loadScrapeJobsWithTasks();
        res.json({ jobs });
    } catch (err: any) {
        console.error('Failed to load jobs+tasks', err);
        res.status(500).json({ error: err?.message || 'failed to load jobs' });
    }
});

export default router;
