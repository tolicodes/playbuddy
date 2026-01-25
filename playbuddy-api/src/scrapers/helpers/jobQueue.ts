import PQueue from 'p-queue';
import { randomUUID } from 'crypto';
import scrapeURLs from './scrapeURLs.js';
import { logScrapeReport } from './scrapeReport.js';
import { supabaseClient } from '../../connections/supabaseClient.js';
import { NormalizedEventInput } from '../../commonTypes.js';
import { upsertEvent } from '../../routes/helpers/writeEventsToDB/upsertEvent.js';
import type { ScrapeSkipReason } from '../types.js';
import type { HtmlScrapeCapture } from './htmlScrapeStore.js';
import { emitScrapeJobStreamEvent } from './scrapeJobStream.js';

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ScrapeJob = {
    id: string;
    status: JobStatus;
    priority: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    createdAt: Date;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    source?: string;
    mode?: string;
    metadata?: Record<string, any>;
};

export type ScrapeTask = {
    id: string;
    jobId: string;
    url: string;
    source?: string;
    status: TaskStatus;
    priority: number;
    attempts: number;
    eventDefaults?: Partial<NormalizedEventInput>;
    prefetched?: NormalizedEventInput[];
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
    skipExisting?: boolean;
    skipExistingNoApproval?: boolean;
    approveExisting?: boolean;
    captureHtml?: HtmlScrapeCapture;
    result?: any;
    error?: string;
    event_id?: string | null;
    createdAt: Date;
    startedAt?: Date;
    finishedAt?: Date;
};

const resolveSource = (url: string): string => {
    try {
        const { hostname } = new URL(url);
        return hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
};

const resolveEventUrl = (event?: Partial<NormalizedEventInput> | null, fallback?: string): string => {
    const pick = (value: unknown) => {
        if (typeof value === 'string') return value.trim();
        if (value === null || value === undefined) return '';
        return String(value).trim();
    };
    const candidates = [
        event ? pick((event as any).source_url) : '',
        event ? pick((event as any).ticket_url) : '',
        event ? pick((event as any).event_url) : '',
        event ? pick((event as any).original_id) : '',
        pick(fallback),
    ].filter(Boolean);
    return candidates[0] || '';
};

const formatSkipReason = (skip: ScrapeSkipReason) => {
    const detail = skip.detail ? ` (${skip.detail})` : '';
    return `${skip.reason}${detail}`;
};

const isScrapeError = (skip: ScrapeSkipReason) => (skip.level ?? 'error') === 'error';

const buildUpsertSkipEntry = (
    event: NormalizedEventInput | undefined,
    result: any,
    fallbackUrl?: string
): ScrapeSkipReason | null => {
    if (!result || result.status !== 'skipped') return null;
    const skip = result.skip || {};
    const url = resolveEventUrl(event, fallbackUrl) || 'unknown';
    return {
        url,
        reason: skip.reason || 'Event skipped during import',
        ...(skip.detail ? { detail: skip.detail } : {}),
        source: skip.source || 'upsert',
        stage: 'upsert',
        level: skip.level ?? 'warn',
        ...(event?.name ? { eventName: event.name } : {}),
        ...(skip.eventId ? { eventId: String(skip.eventId) } : {}),
    };
};

// In-memory stores (swap to Supabase later)
const jobs = new Map<string, ScrapeJob>();
const tasks = new Map<string, ScrapeTask>();

const TASK_CONCURRENCY = Number(process.env.SCRAPE_TASK_CONCURRENCY || 200);
const UPSERT_CONCURRENCY = Number(process.env.SCRAPE_UPSERT_CONCURRENCY || 40);
const taskQueue = new PQueue({ concurrency: TASK_CONCURRENCY });
const upsertQueue = new PQueue({ concurrency: UPSERT_CONCURRENCY });

const toNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const summarizeJobFromTasks = (jobId: string) => {
    let scraped = 0;
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    let taskCount = 0;
    tasks.forEach((task) => {
        if (task.jobId !== jobId) return;
        taskCount += 1;
        const result = task.result || {};
        const scrapedCount = toNumber((result as any).scrapedCount);
        const insertedCount = toNumber((result as any).insertedCount) || ((result as any).inserted ? 1 : 0);
        const updatedCount = toNumber((result as any).updatedCount) || ((result as any).updated ? 1 : 0);
        const failedCount = toNumber((result as any).failedCount) || (((result as any).failed || task.status === 'failed') ? 1 : 0);
        scraped += scrapedCount;
        inserted += insertedCount;
        updated += updatedCount;
        failed += failedCount;
    });
    return { scraped, inserted, updated, failed, tasks: taskCount };
};

let classifyRun: Promise<any> | null = null;
export const triggerClassification = () => {
    if (classifyRun) return classifyRun;
    classifyRun = import('../../scripts/event-classifier/classifyEvents.js')
        .then(mod => mod.classifyEventsInBatches?.())
        .catch(err => {
            console.error('[jobs] classifyEventsInBatches failed', err);
        })
        .finally(() => {
            classifyRun = null;
        });
    return classifyRun;
};

const upsertJobRecord = async (job: ScrapeJob) => {
    try {
        const payload = {
            id: job.id,
            status: job.status,
            mode: job.mode || 'async',
            source: job.source || 'auto',
            priority: job.priority,
            total_tasks: job.totalTasks,
            completed_tasks: job.completedTasks,
            failed_tasks: job.failedTasks,
            created_at: job.createdAt.toISOString(),
            started_at: job.startedAt ? job.startedAt.toISOString() : null,
            finished_at: job.finishedAt ? job.finishedAt.toISOString() : null,
            metadata: job.metadata || {},
        };
        const { error } = await supabaseClient.from('scrape_jobs').upsert(payload);
        if (error) console.error('Failed to persist job', payload, error);
        else console.log(`[jobs] upserted job ${job.id} status=${job.status} (${job.completedTasks}/${job.totalTasks})`);
        emitScrapeJobStreamEvent({ type: 'job', payload });
    } catch (err) {
        console.error('Supabase error persisting job', err);
    }
};

const upsertTaskRecord = async (task: Partial<ScrapeTask> & { id: string; jobId: string }) => {
    try {
        const payload = {
            id: task.id,
            job_id: task.jobId,
            url: task.url,
            source: task.source,
            status: task.status,
            priority: task.priority,
            attempts: task.attempts,
            result: task.result,
            last_error: task.error,
            created_at: task.createdAt?.toISOString(),
            started_at: task.startedAt?.toISOString(),
            finished_at: task.finishedAt?.toISOString(),
            event_id: task as any && (task as any).event_id ? String((task as any).event_id) : null,
        };
        const { error } = await supabaseClient.from('scrape_tasks').upsert(payload);
        if (error) console.error('[jobs] Failed to persist task', task.id, payload, error);
        else console.log(`[jobs] upserted task ${task.id} status=${task.status} url=${task.url}`);
        emitScrapeJobStreamEvent({ type: 'task', payload });
    } catch (err) {
        console.error('[jobs] Supabase error persisting task', task.id, err);
    }
};

// Priority: 1 (highest) .. 10 (lowest) -> p-queue priority (higher number wins)
const mapPriority = (p: number | undefined) => {
    const base = typeof p === 'number' ? p : 5;
    const clamped = Math.min(Math.max(base, 1), 10);
    return 20 - clamped; // invert so 1 => 19, 10 => 10
};

export const getJob = async (jobId: string) => {
    const { data: jobData, error: jobErr } = await supabaseClient.from('scrape_jobs').select('*').eq('id', jobId).single();
    if (jobErr || !jobData) {
        return null;
    }
    const { data: taskData, error: taskErr } = await supabaseClient.from('scrape_tasks').select('*').eq('job_id', jobId);
    if (taskErr) {
        console.error('Failed to fetch tasks', taskErr);
    }
    return { job: jobData, tasks: taskData || [] };
};

export const listJobs = async () => {
    const { data, error } = await supabaseClient.from('scrape_jobs').select('*');
    if (error) {
        console.error('Failed to list jobs', error);
        return [];
    }
    return data;
};

const updateJobProgress = (task: ScrapeTask) => {
    const job = jobs.get(task.jobId);
    const authUserId = job?.metadata?.authUserId || job?.metadata?.auth_user_id;
    if (!job) return;
    if (task.status === 'completed') job.completedTasks += 1;
    if (task.status === 'failed') job.failedTasks += 1;

    const totalDone = job.completedTasks + job.failedTasks;
    if (totalDone === job.totalTasks) {
        job.status = job.failedTasks > 0 ? 'failed' : 'completed';
        job.finishedAt = new Date();
        const summary = summarizeJobFromTasks(job.id);
        const durationMs = job.startedAt && job.finishedAt
            ? job.finishedAt.getTime() - job.startedAt.getTime()
            : undefined;
        logScrapeReport({
            scope: 'job',
            jobId: job.id,
            source: job.source,
            status: job.status,
            scraped: summary.scraped,
            inserted: summary.inserted,
            updated: summary.updated,
            failed: summary.failed,
            tasks: summary.tasks,
            durationMs,
        });
        // Once a scrape job finishes (success or failure), kick off classification for newly added events.
        triggerClassification();
    } else {
        job.status = 'running';
    }
    jobs.set(job.id, job);
    upsertJobRecord(job);
};

const runTask = async (taskId: string) => {
    const task = tasks.get(taskId);
    if (!task) return;
    const taskStart = Date.now();
    task.attempts += 1;
    console.log(`[jobs] start task ${taskId} url=${task.url} source=${task.source || 'unknown'}`);
    const job = jobs.get(task.jobId);
    const authUserId = job?.metadata?.authUserId || job?.metadata?.auth_user_id;
    if (job && job.status === 'pending') {
        job.status = 'running';
        job.startedAt = job.startedAt ?? new Date();
        jobs.set(job.id, job);
        upsertJobRecord(job);
    }

    const updated: ScrapeTask = { ...task, status: 'running', startedAt: new Date(), attempts: task.attempts, createdAt: task.createdAt };
    tasks.set(taskId, updated);
    upsertTaskRecord(updated);

    try {
        const scrapeStart = Date.now();
        const scrapeSkipped: ScrapeSkipReason[] = [];
        const scrapeOptions = {
            onSkip: (skip: ScrapeSkipReason) => scrapeSkipped.push({ ...skip, stage: 'scrape' }),
            ...(task.captureHtml ? { captureHtml: task.captureHtml } : {}),
        };
        const scrapedEvents = task.prefetched ?? await scrapeURLs(
            [{ url: task.url, multipleEvents: task.multipleEvents, extractFromListPage: task.extractFromListPage }],
            task.eventDefaults || {},
            scrapeOptions
        );
        const scrapedCount = scrapedEvents.length;
        console.log(`[jobs] scraped task ${taskId} url=${task.url} events=${scrapedCount} durationMs=${Date.now() - scrapeStart}`);

        const upsertOptions = {
            ...(task.skipExisting ? { skipExisting: true } : {}),
            ...(task.skipExistingNoApproval ? { skipExistingNoApproval: true } : {}),
            ...(task.approveExisting ? { approveExisting: true } : {}),
        };
        const upsertPromises = scrapedEvents.map(ev =>
            upsertQueue.add(async () => {
                try {
                    const res = await upsertEvent(ev, authUserId, upsertOptions);
                    return {
                        status: res.result as 'inserted' | 'updated' | 'failed' | 'skipped',
                        eventId: res.event?.id ? String(res.event.id) : (res.skip?.eventId ? String(res.skip.eventId) : null),
                        error: (res as any).error ? String((res as any).error) : null,
                        skip: res.skip,
                    };
                } catch (err: any) {
                    return { status: 'failed' as const, eventId: null, error: err?.message || String(err) };
                }
            })
        );

        const upsertStart = Date.now();
        const upsertResults = await Promise.allSettled(upsertPromises);
        console.log(`[jobs] upserted task ${taskId} url=${task.url} eventResults=${upsertResults.length} durationMs=${Date.now() - upsertStart}`);

        const eventResults = scrapedEvents.map((event, index) => {
            const res = upsertResults[index];
            if (res?.status === 'fulfilled') {
                return {
                    index,
                    status: res.value.status,
                    eventId: res.value.eventId ?? null,
                    error: res.value.error ?? null,
                    skip: res.value.skip ?? null,
                    name: event?.name ?? null,
                    start_date: event?.start_date ?? null,
                    end_date: event?.end_date ?? null,
                    source_url: event?.source_url ?? null,
                    ticket_url: event?.ticket_url ?? null,
                    event_url: event?.event_url ?? null,
                    original_id: event?.original_id ?? null,
                    organizer: event?.organizer?.name ?? null,
                    location: event?.location ?? null,
                    price: event?.price ?? null,
                };
            }
            const error = res ? (res as PromiseRejectedResult).reason?.message || String((res as PromiseRejectedResult).reason) : null;
            return {
                index,
                status: 'failed',
                eventId: null,
                error,
                skip: null,
                name: event?.name ?? null,
                start_date: event?.start_date ?? null,
                end_date: event?.end_date ?? null,
                source_url: event?.source_url ?? null,
                ticket_url: event?.ticket_url ?? null,
                event_url: event?.event_url ?? null,
                original_id: event?.original_id ?? null,
                organizer: event?.organizer?.name ?? null,
                location: event?.location ?? null,
                price: event?.price ?? null,
            };
        });

        const upsertSkipped: ScrapeSkipReason[] = [];
        const summary = upsertResults.reduce(
            (acc, r, index) => {
                if (r.status === 'fulfilled') {
                    if (r.value.status === 'inserted') {
                        acc.inserted += 1;
                        if (r.value.eventId) acc.insertedIds.push(r.value.eventId);
                    } else if (r.value.status === 'updated') {
                        acc.updated += 1;
                        if (r.value.eventId) acc.updatedIds.push(r.value.eventId);
                    } else if (r.value.status === 'skipped') {
                        acc.skipped += 1;
                        if (r.value.eventId) acc.skippedIds.push(r.value.eventId);
                        const entry = buildUpsertSkipEntry(scrapedEvents[index], r.value, task.url);
                        if (entry) upsertSkipped.push(entry);
                    } else {
                        acc.failed += 1;
                        if (r.value.eventId) acc.failedIds.push(r.value.eventId);
                    }
                    if (r.value.error) acc.errors.push(r.value.error);
                } else {
                    acc.failed += 1;
                    acc.errors.push(r.reason?.message || String(r.reason));
                }
                return acc;
            },
            {
                inserted: 0,
                updated: 0,
                skipped: 0,
                failed: 0,
                errors: [] as string[],
                insertedIds: [] as string[],
                updatedIds: [] as string[],
                skippedIds: [] as string[],
                failedIds: [] as string[],
            }
        );

        const scrapeErrors = scrapeSkipped.filter(isScrapeError);
        const scrapeWarnings = scrapeSkipped.filter(skip => !isScrapeError(skip));
        let scrapeErrorMessage: string | undefined;
        if (scrapeErrors.length) {
            scrapeErrorMessage = formatSkipReason(scrapeErrors[0]);
        } else if (scrapedCount === 0) {
            scrapeErrorMessage = scrapeSkipped.length
                ? formatSkipReason(scrapeSkipped[0])
                : 'No events scraped';
        }
        const scrapeFailed = !!scrapeErrorMessage;
        const errorMessages = [...summary.errors];
        if (scrapeErrorMessage) errorMessages.unshift(scrapeErrorMessage);
        const errorMessage = errorMessages.length ? errorMessages.join('; ') : undefined;

        const status: TaskStatus = summary.failed > 0 || scrapeFailed ? 'failed' : 'completed';
        const finishedAt = new Date();
        const skipped = [...scrapeSkipped, ...upsertSkipped];
        const skippedCount = skipped.length;
        const eventIdForTask =
            summary.insertedIds[0] ||
            summary.updatedIds[0] ||
            summary.failedIds[0] ||
            summary.skippedIds[0] ||
            null;
        const resultPayload = {
            scrapedCount,
            insertedCount: summary.inserted,
            updatedCount: summary.updated,
            failedCount: summary.failed,
            skippedCount,
            inserted: summary.inserted > 0,
            updated: summary.updated > 0,
            failed: summary.failed > 0 || scrapeFailed,
            errorMessage,
            scrapeFailed,
            scrapeErrorMessage,
            scrapeErrors: scrapeErrors.length ? scrapeErrors : undefined,
            scrapeWarnings: scrapeWarnings.length ? scrapeWarnings : undefined,
            insertedIds: summary.insertedIds,
            updatedIds: summary.updatedIds,
            failedIds: summary.failedIds,
            skippedIds: summary.skippedIds,
            skipped: skippedCount > 0 ? skipped : undefined,
            eventResults: eventResults.length ? eventResults : undefined,
            htmlFiles: task.captureHtml?.files?.length ? task.captureHtml.files : undefined,
        };

        tasks.set(taskId, {
            ...updated,
            status,
            result: resultPayload,
            finishedAt,
            event_id: eventIdForTask,
        });
        upsertTaskRecord({
            id: taskId,
            jobId: task.jobId,
            url: task.url,
            status,
            priority: task.priority,
            attempts: updated.attempts,
            source: task.source,
            result: resultPayload,
            event_id: eventIdForTask,
            finishedAt,
        });
        updateJobProgress({ ...updated, status });
        const totalDurationMs = Date.now() - taskStart;
        logScrapeReport({
            scope: 'task',
            jobId: task.jobId,
            taskId,
            source: task.source,
            url: task.url,
            status,
            scraped: scrapedCount,
            inserted: summary.inserted,
            updated: summary.updated,
            failed: summary.failed + (scrapeFailed ? 1 : 0),
            durationMs: totalDurationMs,
        });
        console.log(
            `[jobs] completed task ${taskId} url=${task.url} scraped=${scrapedCount} inserted=${summary.inserted} updated=${summary.updated} failed=${summary.failed} totalDurationMs=${totalDurationMs}`
        );
    } catch (err: any) {
        const errorMessage = err?.message || 'scrape failed';
        const totalDurationMs = Date.now() - taskStart;
        const resultPayload = {
            scrapedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            failedCount: 1,
            inserted: false,
            updated: false,
            failed: true,
            errorMessage,
            scrapeFailed: true,
            scrapeErrorMessage: errorMessage,
            htmlFiles: task.captureHtml?.files?.length ? task.captureHtml.files : undefined,
        };
        tasks.set(taskId, {
            ...updated,
            status: 'failed',
            error: errorMessage,
            result: resultPayload,
            finishedAt: new Date(),
        });
        upsertTaskRecord({
            id: taskId,
            jobId: task.jobId,
            url: task.url,
            status: 'failed',
            priority: task.priority,
            attempts: updated.attempts,
            source: task.source,
            error: errorMessage,
            result: resultPayload,
            finishedAt: new Date(),
        });
        updateJobProgress({ ...updated, status: 'failed' });
        logScrapeReport({
            scope: 'task',
            jobId: task.jobId,
            taskId,
            source: task.source,
            url: task.url,
            status: 'failed',
            scraped: 0,
            inserted: 0,
            updated: 0,
            failed: 1,
            durationMs: totalDurationMs,
            error: errorMessage,
        });
        console.error(`[jobs] failed task ${taskId} url=${task.url} durationMs=${totalDurationMs} error=${errorMessage}`);
    }
};

type JobInput = string | {
    url: string;
    eventDefaults?: Partial<NormalizedEventInput>;
    prefetched?: NormalizedEventInput[];
    source?: string;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
    skipExisting?: boolean;
    skipExistingNoApproval?: boolean;
    approveExisting?: boolean;
    captureHtml?: HtmlScrapeCapture;
};

type JobOptions = {
    priority?: number;
    authUserId?: string;
    source?: string;
    metadata?: Record<string, any>;
};

export const createJob = async (urls: JobInput[], priority = 5, options: JobOptions = {}) => {
    const jobId = randomUUID();
    const now = new Date();
    const job: ScrapeJob = {
        id: jobId,
        status: 'pending',
        priority,
        totalTasks: urls.length,
        completedTasks: 0,
        failedTasks: 0,
        createdAt: now,
        startedAt: null,
        finishedAt: null,
        source: options.source || 'auto',
        mode: 'async',
        metadata: { ...(options.metadata || {}), authUserId: options.authUserId },
    };

    jobs.set(jobId, job);
    await upsertJobRecord(job);
    console.log(`[jobs] createJob ${jobId} tasks=${urls.length} priority=${priority}`);

    const mappedPriority = mapPriority(priority);

    for (const input of urls) {
        const url = typeof input === 'string' ? input : input.url;
        const eventDefaults = typeof input === 'string' ? undefined : input.eventDefaults;
        const prefetched = typeof input === 'string' ? undefined : input.prefetched;
        const inputSource = typeof input === 'string' ? undefined : input.source;
        const multipleEvents = typeof input === 'string' ? undefined : input.multipleEvents;
        const extractFromListPage = typeof input === 'string' ? undefined : input.extractFromListPage;
        const skipExisting = typeof input === 'string' ? undefined : input.skipExisting;
        const skipExistingNoApproval = typeof input === 'string' ? undefined : input.skipExistingNoApproval;
        const approveExisting = typeof input === 'string' ? undefined : input.approveExisting;
        const captureHtml = typeof input === 'string' ? undefined : input.captureHtml;
        const source = inputSource || resolveSource(url);
        const taskId = randomUUID();
        const captureHtmlWithIds = captureHtml
            ? {
                ...captureHtml,
                jobId,
                taskId,
                source: captureHtml.source || source,
                files: [],
            }
            : undefined;
        const task: ScrapeTask = {
            id: taskId,
            jobId,
            url,
            source,
            status: 'pending',
            priority,
            attempts: 0,
            eventDefaults,
            prefetched,
            multipleEvents,
            extractFromListPage,
            skipExisting,
            skipExistingNoApproval,
            approveExisting,
            captureHtml: captureHtmlWithIds,
            createdAt: now,
        };
        tasks.set(taskId, task);
        await upsertTaskRecord(task);
        console.log(`[jobs] enqueue task ${taskId} priority=${priority} url=${url}`);
        taskQueue.add(() => runTask(taskId), { priority: mappedPriority }).catch(err => {
            console.error('[jobs] Task queue error', err);
        });
    }

    return jobId;
};
