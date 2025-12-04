import { Response, Router } from 'express';
import PQueue from 'p-queue';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import { Event } from '../commonTypes.js';
import { getMyPrivateCommunities } from './helpers/getMyPrivateCommunities.js';
import { authenticateAdminRequest, AuthenticatedRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js';
import { upsertEvent, UpsertEventResult } from './helpers/writeEventsToDB/upsertEvent.js';
import { flushEvents } from '../helpers/flushCache.js';
import { transformMedia } from './helpers/transformMedia.js';
import scrapeURLs from '../scrapers/scrapeURLs.js';
import { classifyEventsInBatches } from '../scripts/event-classifier/classifyEvents.js';
import { createJob, getJob } from '../scrapers/jobQueue.js';
import { listJobs } from '../scrapers/jobQueue.js';
import runAllScrapers from '../scrapers/runAllScrapers.js';

const router = Router();
const EXCLUDE_EVENT_IDS = [
    "e7179b3b-b4f8-40df-8d87-f205b0caaeb1", // New York LGBTQ+ Community Events Calendar
    "036f8010-9910-435f-8119-2025a046f452", // NYC Kink Community Events Calendar
];

router.get('/', optionalAuthenticateRequest, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKey = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";
    const includeHiddenOrganizers = req.query.includeHiddenOrganizers === 'true';
    const includeHiddenEvents = req.query.includeHidden === 'true';
    const visibilityParam = req.query.visibility;
    const cacheKeyWithFlags = `${cacheKey}:${includeHiddenOrganizers}:${includeHiddenEvents}:${visibilityParam || 'public'}`;

    if (req.query.visibility === 'private') {
        if (!req.authUserId) {
            console.error('User not specified for private events');
            res.status(401).send({ error: 'User not specified for private events' });
            return;
        }
    }

    try {
        let redisClient = null;
        try {
            redisClient = await connectRedisClient();
        } catch (err) {
            console.error('[events] redis unavailable, proceeding without cache', err);
        }

        const runQuery = () => {
            let query =
                // @ts-ignore
                supabaseClient
                    .from("events")
                    .select(`
          *,
          organizer:organizers(id, name, url, hidden, promo_codes(id, promo_code, discount, discount_type, scope, organizer_id)),
          communities!inner(id, name, organizer_id),
          location_area:location_areas(id, name),
          promo_code_event(
              promo_codes(*)
          ),
          event_media (
            id, sort_order, created_at,
            media: media ( * )
            ),
          classification:classifications(
                tags,
                experience_level,
                interactivity_level,
                inclusivity
            )
        `)
                    .gte("start_date", nycMidnightUTC);

            if (!includeHiddenEvents) {
                query = query.eq('hidden', false);
            }

            return query;
        };

        const responseData = redisClient
            ? await fetchAndCacheData(redisClient, cacheKeyWithFlags, runQuery, flushCache)
            : JSON.stringify((await runQuery()).data || []);

        let response = JSON.parse(responseData);

        const transformPromoCodes = (response: any) => {
            return response.map((responseItem: any) => {
                const promoCodes = responseItem.promo_code_event.map((code: any) => code.promo_codes);
                const newResponseItem = {
                    ...responseItem,
                    promo_codes: promoCodes
                }

                delete newResponseItem.promo_code_event;

                return newResponseItem;
            })
        }

        response.map((eventResponse: any) => {
            eventResponse.media = transformMedia(eventResponse.event_media);
            return eventResponse;
        })

        response = transformPromoCodes(response);

        // filter out hidden organizers that we want to ignore but are still automatically ingested into the database
        const eventsWithVisibleOrganizers = includeHiddenOrganizers
            ? response
            : response.filter((event: Event) => !event.organizer.hidden);

        // If requesting private events, include both public and my private events
        if (req.query.visibility === 'private') {
            if (!req.authUserId) {
                console.error('User not specified');
                throw Error('User not specified');
            }

            const myPrivateCommunities = await getMyPrivateCommunities(req.authUserId);

            // must be in my private communities and be a private event
            const myPrivateCommunityEvents = eventsWithVisibleOrganizers.filter((event: Event) => {
                return event.communities?.find((community) => myPrivateCommunities.includes(community.id))
                    && event.visibility === 'private'
            })

            const publicEvents = eventsWithVisibleOrganizers.filter((event: Event) => event.visibility === 'public');
            const mergedById = [...publicEvents, ...myPrivateCommunityEvents].reduce<Record<string, Event>>((acc, ev: any) => {
                acc[String(ev.id)] = ev;
                return acc;
            }, {});
            res.status(200).send(Object.values(mergedById));
            return;
        }

        // Default: public events only
        const publicEvents = eventsWithVisibleOrganizers.filter((event: Event) => event.visibility === 'public');
        response = publicEvents;

        // if we request the wishlist, we need to filter the events
        if (calendarType === 'wishlist') {
            if (!req.query.authUserId) {
                throw Error('User not specified');
            }

            // @ts-ignore
            const { data: wishlistEvents, error } = await supabaseClient
                .from("event_wishlist")
                .select("event_id")
                .eq("user_id", req.query.authUserId);


            if (error) {
                throw new Error(`Error fetching wishlist events: ${error.message}`);
            }

            const wishlistEventIds = wishlistEvents?.map((event: { event_id: string }) => event.event_id) || [];

            response = response.filter((event: { id: string }) => {
                return wishlistEventIds.includes(event.id);
            });
        }

        if (req.query.format === "ical") {
            res
                .status(200)
                .set("Content-Type", "text/calendar")
                .send(createIcal(response, calendarType));
        } else {
            console.log('[events] sending', response.length, 'events')
            res.status(200).send(response);
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ error: error });
    }
});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    console.log('post events')
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId)
    await flushEvents();

    res.json(eventResult);
});


const printBulkAddStats = (eventResults: UpsertEventResult[]) => {
    const counts = {
        created: 0,
        updated: 0,
        failed: 0,
    };

    for (const eventResult of eventResults) {
        if (eventResult.result === 'updated') {
            counts.updated++;
        } else if (eventResult.result === 'inserted') {
            counts.created++;
        } else {
            counts.failed++;
        }
    }

    console.log(`Created: ${counts.created}`);
    console.log(`Updated: ${counts.updated}`);
    console.log(`Failed: ${counts.failed}`);

    return {
        created: counts.created,
        updated: counts.updated,
        failed: counts.failed,
    }
}

const upsertEventsClassifyAndStats = async (events: any[], authUserId: string | undefined) => {
    if (!authUserId) {
        throw Error('User not specified');
    }

    const upsertQueue = new PQueue({ concurrency: 40 });
    const eventResults: UpsertEventResult[] = [];

    await Promise.all(
        events.map(event =>
            upsertQueue.add(async () => {
                const eventResult = await upsertEvent(event, authUserId);
                eventResults.push(eventResult);
            })
        )
    );
    await upsertQueue.onIdle();

    const stats = printBulkAddStats(eventResults);
    await flushEvents();

    await classifyEventsInBatches();

    return {
        stats,
        events: eventResults,
    };
}

router.post('/bulk', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const events = req.body;

    const eventResults = await upsertEventsClassifyAndStats(events, req.authUserId);
    res.json(eventResults);
});

// Run all scrapers (Eventbrite organizers, Plura, TantraNY) and upsert + classify
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
        console.log('[scrape-jobs] fetched jobs', jobIds.length);

        let tasks: any[] = [];
        if (jobIds.length > 0) {
            const { data: t, error: tasksErr } = await supabaseClient
                .from('scrape_tasks')
                .select('*')
                .in('job_id', jobIds);
            if (tasksErr) {
                console.error('[scrape-jobs] failed tasks query', tasksErr);
                res.status(500).json({ error: tasksErr.message });
                return;
            }
            tasks = t || [];
        }
        console.log('[scrape-jobs] fetched tasks', tasks.length);

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

router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId)
    await flushEvents();

    res.json(eventResult);
});

router.put("/weekly-picks/:eventId", authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!eventId) {
        return res.status(400).json({ error: "eventId is required in URL" });
    }

    try {
        const { data, error } = await supabaseClient
            .from("events")
            .update({ weekly_pick: status })
            .eq("id", parseInt(eventId))
            .select()
            .single();

        if (error) {
            console.error("Supabase update error:", error);
            return res.status(500).json({ error: error.message });
        }

        await flushEvents();

        return res.status(200).json({ message: "Event marked as weekly pick", event: data });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});



export default router;
