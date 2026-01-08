import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { scrapeGmailSources, type GmailSourceConfig } from '../scrapers/gmail.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_GMAIL_LIST = path.resolve(__dirname, '../../data/datasets/gmail_sources.json');

const normalizeGmailSources = (raw: any): GmailSourceConfig[] => {
    return (Array.isArray(raw) ? raw : [raw])
        .map((entry: any) => {
            const rawStatus = typeof entry?.event_status === 'string' ? entry.event_status.toLowerCase() : '';
            const event_status = rawStatus === 'approved' || rawStatus === 'pending' ? rawStatus : undefined;
            return {
                source_email: String(entry?.source_email || '').trim(),
                event_status,
            };
        })
        .filter((entry: GmailSourceConfig) => Boolean(entry.source_email));
};

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

// Scrape urls.json only (AI/auto routes)
router.post('/scrape-ai-urls', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId, enqueued } = await runAllScrapers(req.authUserId, { scenario: 'urls_json' });
        res.json({ jobId, enqueued, scenario: 'urls_json' });
    } catch (err: any) {
        console.error('Error scraping urls.json sources', err);
        res.status(500).json({ error: err?.message || 'Failed to scrape urls.json sources' });
    }
});

router.post('/scrape-gmail', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { sources, maxResults } = req.body || {};
        let gmailSources: GmailSourceConfig[] = [];

        if (Array.isArray(sources) && sources.length) {
            gmailSources = normalizeGmailSources(sources);
        } else {
            const listPath = process.env.GMAIL_SOURCES_LIST
                ? path.resolve(process.cwd(), process.env.GMAIL_SOURCES_LIST)
                : DEFAULT_GMAIL_LIST;
            const raw = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, 'utf-8')) : [];
            gmailSources = normalizeGmailSources(raw);
        }

        if (!gmailSources.length) {
            res.status(400).json({ error: 'sources is required (array) or configure data/datasets/gmail_sources.json' });
            return;
        }

        const gmailEvents = await scrapeGmailSources(gmailSources, { maxResults });
        const gmailTasks = gmailEvents.map((ev, idx) => ({
            url: ev.source_url || ev.ticket_url || ev.event_url || ev.original_id || `gmail:event:${idx}`,
            source: 'gmail',
            prefetched: [ev],
            skipExisting: true,
            skipExistingNoApproval: true,
        }));

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
