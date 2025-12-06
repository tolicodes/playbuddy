import { Router, Response } from 'express';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { createJob, getJob, listJobs } from '../scrapers/helpers/jobQueue.js';
import runAllScrapers from '../scrapers/helpers/runAllScrapers.js';
import { supabaseClient } from '../connections/supabaseClient.js';

const router = Router();

// Run all scrapers (Eventbrite organizers, Plura, TantraNY) and enqueue
router.post('/scrape', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId, enqueued } = await runAllScrapers(req.authUserId);
        res.json({ jobId, enqueued });
    } catch (err: any) {
        console.error('Error scraping all sources', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape sources' });
    }
});

router.post('/import-urls', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { urls, priority = 5 } = req.body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ error: 'urls (array) is required' });
        return;
    }
    const jobId = await createJob(urls, priority, { authUserId: req.authUserId, source: 'auto' });
    res.json({ jobId });
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
