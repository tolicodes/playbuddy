import PQueue from 'p-queue';
import { randomUUID } from 'crypto';
import scrapeURLs from './scrapeURLs.js';

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
    updatedAt: Date;
};

export type ScrapeTask = {
    id: string;
    jobId: string;
    url: string;
    status: TaskStatus;
    priority: number;
    result?: any;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    finishedAt?: Date;
};

// In-memory stores (swap to Supabase later)
const jobs = new Map<string, ScrapeJob>();
const tasks = new Map<string, ScrapeTask>();

const TASK_CONCURRENCY = Number(process.env.SCRAPE_TASK_CONCURRENCY || 200);
const taskQueue = new PQueue({ concurrency: TASK_CONCURRENCY });

// Priority: 1 (highest) .. 10 (lowest) -> p-queue priority (higher number wins)
const mapPriority = (p: number | undefined) => {
    const base = typeof p === 'number' ? p : 5;
    const clamped = Math.min(Math.max(base, 1), 10);
    return 20 - clamped; // invert so 1 => 19, 10 => 10
};

export const getJob = (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job) return null;
    const jobTasks = Array.from(tasks.values()).filter(t => t.jobId === jobId);
    return { job, tasks: jobTasks };
};

export const listJobs = () => Array.from(jobs.values());

const updateJobProgress = (task: ScrapeTask) => {
    const job = jobs.get(task.jobId);
    if (!job) return;
    if (task.status === 'completed') job.completedTasks += 1;
    if (task.status === 'failed') job.failedTasks += 1;

    const totalDone = job.completedTasks + job.failedTasks;
    job.status = totalDone === job.totalTasks ? (job.failedTasks > 0 ? 'failed' : 'completed') : 'running';
    job.updatedAt = new Date();
    jobs.set(job.id, job);
};

const runTask = async (taskId: string) => {
    const task = tasks.get(taskId);
    if (!task) return;
    const job = jobs.get(task.jobId);
    if (job && job.status === 'pending') {
        job.status = 'running';
        job.updatedAt = new Date();
        jobs.set(job.id, job);
    }

    const updated: ScrapeTask = { ...task, status: 'running', startedAt: new Date(), updatedAt: new Date() };
    tasks.set(taskId, updated);

    try {
        const [result] = await scrapeURLs([task.url]);

        tasks.set(taskId, {
            ...updated,
            status: 'completed',
            result,
            finishedAt: new Date(),
            updatedAt: new Date(),
        });
        updateJobProgress({ ...updated, status: 'completed' });
    } catch (err: any) {
        tasks.set(taskId, {
            ...updated,
            status: 'failed',
            error: err?.message || 'scrape failed',
            finishedAt: new Date(),
            updatedAt: new Date(),
        });
        updateJobProgress({ ...updated, status: 'failed' });
    }
};

export const createJob = (urls: string[], priority = 5) => {
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
        updatedAt: now,
    };

    jobs.set(jobId, job);

    const mappedPriority = mapPriority(priority);

    urls.forEach(url => {
        const taskId = randomUUID();
        const task: ScrapeTask = {
            id: taskId,
            jobId,
            url,
            status: 'pending',
            priority,
            createdAt: now,
            updatedAt: now,
        };
        tasks.set(taskId, task);
        taskQueue.add(() => runTask(taskId), { priority: mappedPriority }).catch(err => {
            console.error('Task queue error', err);
        });
    });

    return jobId;
};
