import { Router, Response } from 'express';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { createJob, getJob, listJobs } from '../scrapers/helpers/jobQueue.js';
import runAllScrapers from '../scrapers/helpers/runAllScrapers.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import scrapeURLs from '../scrapers/helpers/scrapeURLs.js';
import { upsertEvent } from './helpers/writeEventsToDB/upsertEvent.js';
import { flushEvents } from '../helpers/flushCache.js';
import { NormalizedEventInput } from '../commonTypes.js';
import { classifyEventsInBatches } from '../scripts/event-classifier/classifyEvents.js';

const router = Router();

// Run all scrapers (Eventbrite organizers, Plura, TantraNY) and enqueue
router.post('/scrape', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const scenario = req.query.scenario?.toString();
        const { jobId, enqueued } = await runAllScrapers(req.authUserId, { scenario });
        res.json({ jobId, enqueued, scenario: scenario || 'all' });
    } catch (err: any) {
        console.error('Error scraping all sources', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape sources' });
    }
});

router.post('/import-urls', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { urls, eventDefaults = {} } = req.body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ error: 'urls (array) is required' });
        return;
    }
    try {
        const scraped: NormalizedEventInput[] = await scrapeURLs(urls as any[], eventDefaults);

        const results = [];
        const eventIds: (string | number)[] = [];
        for (const ev of scraped) {
            try {
                const upsertRes = await upsertEvent(ev, req.authUserId);
                results.push(upsertRes);
                if (upsertRes.event?.id) eventIds.push(upsertRes.event.id);
            } catch (err: any) {
                results.push({ result: 'failed', event: null, error: err?.message || String(err) });
            }
        }

        await flushEvents();
        // Run classifier synchronously so the caller gets the final version.
        await classifyEventsInBatches();

        // Fetch final versions of the upserted events after classification
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

        const counts = results.reduce(
            (acc, r: any) => {
                if (r.result === 'inserted') acc.inserted += 1;
                else if (r.result === 'updated') acc.upserted += 1;
                else acc.failed += 1;
                acc.total += 1;
                return acc;
            },
            { inserted: 0, upserted: 0, failed: 0, total: 0 }
        );

        res.json({
            requested: urls.length,
            scraped: scraped.length,
            counts,
            events: results,
            finalEvents,
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

// Jobs + tasks in one payload
router.get('/scrape-jobs', authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const { data: jobs, error: jobsErr } = await supabaseClient
            .from('scrape_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);
        if (jobsErr) {
            res.status(500).json({ error: jobsErr.message });
            return;
        }

        const jobIds = (jobs || []).map((j: any) => j.id);
        let tasks: any[] = [];
        if (jobIds.length > 0) {
            const { data: t, error: tasksErr } = await supabaseClient
                .from('scrape_tasks')
                .select('*')
                .in('job_id', jobIds);
            if (tasksErr) {
                res.status(500).json({ error: tasksErr.message });
                return;
            }
            tasks = t || [];
        }

        const grouped = (jobs || []).map((job: any) => ({
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
        res.json({ jobs: grouped });
    } catch (err: any) {
        console.error('Failed to load jobs+tasks', err);
        res.status(500).json({ error: err?.message || 'failed to load jobs' });
    }
});

export default router;
