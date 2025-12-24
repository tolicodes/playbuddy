import PQueue from 'p-queue';
import { randomUUID } from 'crypto';
import scrapeURLs from './scrapeURLs.js';
import { supabaseClient } from '../../connections/supabaseClient.js';
import { NormalizedEventInput } from '../../commonTypes.js';
import { upsertEvent } from '../../routes/helpers/writeEventsToDB/upsertEvent.js';

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

// In-memory stores (swap to Supabase later)
const jobs = new Map<string, ScrapeJob>();
const tasks = new Map<string, ScrapeTask>();

const TASK_CONCURRENCY = Number(process.env.SCRAPE_TASK_CONCURRENCY || 200);
const UPSERT_CONCURRENCY = Number(process.env.SCRAPE_UPSERT_CONCURRENCY || 40);
const taskQueue = new PQueue({ concurrency: TASK_CONCURRENCY });
const upsertQueue = new PQueue({ concurrency: UPSERT_CONCURRENCY });

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
        const scrapedEvents = task.prefetched ?? await scrapeURLs(
            [{ url: task.url, multipleEvents: task.multipleEvents, extractFromListPage: task.extractFromListPage }],
            task.eventDefaults || {}
        );
        const upsertPromises = scrapedEvents.map(ev =>
            upsertQueue.add(async () => {
                try {
                    const res = await upsertEvent(ev, authUserId);
                    return {
                        status: res.result as 'inserted' | 'updated' | 'failed',
                        eventId: res.event?.id ? String(res.event.id) : null,
                        error: null as string | null,
                    };
                } catch (err: any) {
                    return { status: 'failed' as const, eventId: null, error: err?.message || String(err) };
                }
            })
        );

        const upsertResults = await Promise.allSettled(upsertPromises);

        const summary = upsertResults.reduce(
            (acc, r) => {
                if (r.status === 'fulfilled') {
                    if (r.value.status === 'inserted') {
                        acc.inserted += 1;
                        if (r.value.eventId) acc.insertedIds.push(r.value.eventId);
                    } else if (r.value.status === 'updated') {
                        acc.updated += 1;
                        if (r.value.eventId) acc.updatedIds.push(r.value.eventId);
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
            { inserted: 0, updated: 0, failed: 0, errors: [] as string[], insertedIds: [] as string[], updatedIds: [] as string[], failedIds: [] as string[] }
        );

        const status: TaskStatus = summary.failed > 0 ? 'failed' : 'completed';
        const finishedAt = new Date();
        const eventIdForTask =
            summary.insertedIds[0] ||
            summary.updatedIds[0] ||
            summary.failedIds[0] ||
            null;
        const resultPayload = {
            inserted: summary.inserted > 0,
            updated: summary.updated > 0,
            failed: summary.failed > 0,
            errorMessage: summary.errors.length ? summary.errors.join('; ') : undefined,
            insertedIds: summary.insertedIds,
            updatedIds: summary.updatedIds,
            failedIds: summary.failedIds,
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
        console.log(
            `[jobs] completed task ${taskId} url=${task.url} scraped=${scrapedEvents.length} inserted=${summary.inserted} updated=${summary.updated} failed=${summary.failed}`
        );
    } catch (err: any) {
        tasks.set(taskId, {
            ...updated,
            status: 'failed',
            error: err?.message || 'scrape failed',
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
            error: err?.message || 'scrape failed',
            finishedAt: new Date(),
        });
        updateJobProgress({ ...updated, status: 'failed' });
        console.error(`[jobs] failed task ${taskId} url=${task.url} error=${err?.message || err}`);
    }
};

type JobInput = string | {
    url: string;
    eventDefaults?: Partial<NormalizedEventInput>;
    prefetched?: NormalizedEventInput[];
    source?: string;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
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
        const source = inputSource || resolveSource(url);
        const taskId = randomUUID();
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
