import { Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, authenticateAdminRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project
import asyncHandler from './helpers/asyncHandler.js';
const router = Router();

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_LIMIT = 100000;
const MAX_LIMIT = 100000;
const SUPABASE_BATCH_LIMIT = 1000;
const DEFAULT_RECENT_LIMIT = 20;
const MAX_RECENT_LIMIT = 100;
const DEFAULT_TOP_LIMIT = 8;

const parseIsoDate = (value: unknown) => {
    if (typeof value !== 'string' || !value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString();
};

const clampLimit = (value: unknown) => {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
    return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const clampRecentLimit = (value: unknown) => {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(parsed)) return DEFAULT_RECENT_LIMIT;
    return Math.min(Math.max(parsed, 1), MAX_RECENT_LIMIT);
};

const clampTopLimit = (value: unknown) => {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(parsed)) return DEFAULT_TOP_LIMIT;
    return Math.min(Math.max(parsed, 1), DEFAULT_TOP_LIMIT * 5);
};

const parseBoolean = (value: unknown) => value === 'true';

const normalizeDeviceId = (value: unknown) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const extractEventId = (props: unknown) => {
    if (!props || typeof props !== 'object') return null;
    const record = props as Record<string, unknown>;
    const raw = record.event_id;
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    return null;
};

const toDayKey = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const fetchUserEvents = async ({
    start,
    end,
    limit,
    eventNames,
}: {
    start: string;
    end: string;
    limit: number;
    eventNames: string[];
}) => {
    const selectFields = 'id, created_at, user_event_name, user_event_props, auth_user_id, device_id';
    const events: any[] = [];
    let cursor: number | string | null = null;
    let pages = 0;
    const maxPages = Math.ceil(limit / SUPABASE_BATCH_LIMIT) + 1;

    while (events.length < limit && pages < maxPages) {
        const remaining = limit - events.length;
        const batchLimit = Math.min(remaining, SUPABASE_BATCH_LIMIT);

        let batchQuery = supabaseClient
            .from('user_events')
            .select(selectFields)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('id', { ascending: false })
            .limit(batchLimit);

        if (eventNames.length > 0) {
            batchQuery = batchQuery.in('user_event_name', eventNames);
        }

        if (cursor !== null) {
            batchQuery = batchQuery.lt('id', cursor);
        }

        const { data: batchData, error: batchError } = await batchQuery;

        if (batchError) {
            throw batchError;
        }

        if (!batchData || batchData.length === 0) {
            break;
        }

        events.push(...batchData);
        pages += 1;

        const nextCursor = batchData[batchData.length - 1]?.id ?? null;
        if (nextCursor === null || nextCursor === cursor || batchData.length < batchLimit) {
            break;
        }
        cursor = nextCursor;
    }

    const isTruncated = events.length >= limit;

    return { events, isTruncated };
};

router.get('/analytics', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startParam = parseIsoDate(req.query.start);
    const endParam = parseIsoDate(req.query.end);
    const onlySignedIn = parseBoolean(req.query.only_signed_in);
    const onlyEventRelated = parseBoolean(req.query.only_event_related);
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const now = new Date();
    const fallbackStart = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let start = startParam ?? fallbackStart;
    let end = endParam ?? now.toISOString();

    if (new Date(start).getTime() > new Date(end).getTime()) {
        [start, end] = [end, start];
    }

    const limit = clampLimit(req.query.limit);
    const recentLimit = clampRecentLimit(req.query.recent_limit);
    const topLimit = clampTopLimit(req.query.top_limit);
    const rawEventNames = typeof req.query.event_names === 'string'
        ? req.query.event_names
        : typeof req.query.event_name === 'string'
            ? req.query.event_name
            : '';
    const eventNames = rawEventNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

    let rawEvents: any[] = [];
    let isTruncated = false;
    try {
        const fetchResult = await fetchUserEvents({ start, end, limit, eventNames });
        rawEvents = fetchResult.events;
        isTruncated = fetchResult.isTruncated;
    } catch (error: any) {
        console.error(`Error fetching user events: ${error?.message || error}`);
        return res.status(500).json({ error: 'Failed to fetch user events' });
    }

    const totalInRange = rawEvents.length;
    const dayCounts = new Map<string, number>();
    const nameCounts = new Map<string, number>();
    const eventIdCounts = new Map<string, number>();
    const uniqueUsers = new Set<string>();
    const recentEvents: any[] = [];
    let eventLinked = 0;
    let totalEvents = 0;

    rawEvents.forEach((event) => {
        if (onlySignedIn && !event.auth_user_id) return;
        const eventId = extractEventId(event.user_event_props);
        if (onlyEventRelated && !eventId) return;
        if (search && !(event.user_event_name || '').toLowerCase().includes(search)) return;

        totalEvents += 1;

        const name = event.user_event_name || 'unknown';
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);

        const dayKey = toDayKey(event.created_at);
        if (dayKey) {
            dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
        }

        if (event.auth_user_id) {
            uniqueUsers.add(event.auth_user_id);
        }

        if (eventId) {
            eventLinked += 1;
            eventIdCounts.set(eventId, (eventIdCounts.get(eventId) ?? 0) + 1);
        }

        if (recentEvents.length < recentLimit) {
            recentEvents.push(event);
        }
    });

    const toTopList = (map: Map<string, number>) => {
        return Array.from(map.entries())
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, topLimit)
            .map(([label, count]) => ({ label, count }));
    };

    const topEventIds = toTopList(eventIdCounts);
    const daySeries = Array.from(dayCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

    const lookupIds = new Set<string>();
    topEventIds.forEach((item) => {
        if (item.label) lookupIds.add(item.label);
    });
    recentEvents.forEach((event) => {
        const eventId = extractEventId(event.user_event_props);
        if (eventId) lookupIds.add(eventId);
    });

    const numericIds = Array.from(lookupIds)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));

    const eventMetaById: Record<string, { name: string; organizer_name: string | null }> = {};

    if (numericIds.length > 0) {
        const { data: eventsData, error: eventsError } = await supabaseClient
            .from('events')
            .select('id, name, organizer:organizers(name)')
            .in('id', numericIds);

        if (eventsError) {
            console.error(`Error fetching event metadata: ${eventsError.message}`);
        } else {
            (eventsData || []).forEach((row: any) => {
                eventMetaById[String(row.id)] = {
                    name: row.name ?? 'Unknown event',
                    organizer_name: row.organizer?.name ?? null,
                };
            });
        }
    }

    return res.status(200).json({
        range: { start, end },
        limit,
        isTruncated,
        totalInRange,
        totalEvents,
        stats: {
            uniqueUsers: uniqueUsers.size,
            distinctEventNames: nameCounts.size,
            uniqueEventIds: eventIdCounts.size,
            eventLinked,
        },
        daySeries,
        topNames: toTopList(nameCounts),
        topEventIds,
        eventMetaById,
        recentEvents,
    });
}));

router.get('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startParam = parseIsoDate(req.query.start);
    const endParam = parseIsoDate(req.query.end);
    const includeCount = req.query.include_count === 'true';
    const now = new Date();
    const fallbackStart = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let start = startParam ?? fallbackStart;
    let end = endParam ?? now.toISOString();

    if (new Date(start).getTime() > new Date(end).getTime()) {
        [start, end] = [end, start];
    }

    const limit = clampLimit(req.query.limit);
    const rawEventNames = typeof req.query.event_names === 'string'
        ? req.query.event_names
        : typeof req.query.event_name === 'string'
            ? req.query.event_name
            : '';
    const eventNames = rawEventNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

    let responseCount: number | null = null;
    let countIsEstimated = false;
    if (includeCount) {
        let countQuery = supabaseClient
            .from('user_events')
            .select('id', { count: 'estimated', head: true })
            .gte('created_at', start)
            .lte('created_at', end);

        if (eventNames.length > 0) {
            countQuery = countQuery.in('user_event_name', eventNames);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
            console.error(`Error counting user events: ${countError.message}`);
        } else if (typeof count === 'number') {
            responseCount = count;
            countIsEstimated = true;
        }
    }

    let safeData: any[] = [];
    let isTruncated = false;
    try {
        const fetchResult = await fetchUserEvents({ start, end, limit, eventNames });
        safeData = fetchResult.events;
        isTruncated = fetchResult.isTruncated;
    } catch (error: any) {
        console.error(`Error fetching user events: ${error?.message || error}`);
        return res.status(500).json({ error: 'Failed to fetch user events' });
    }

    if (responseCount !== null) {
        isTruncated = responseCount > safeData.length;
    }

    return res.status(200).json({
        data: safeData,
        count: responseCount,
        countIsEstimated,
        range: { start, end },
        limit,
        isTruncated,
    });
}));

router.post('/', optionalAuthenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { user_event_name, user_event_props } = req.body;
    const propsDeviceId = normalizeDeviceId(
        (user_event_props as Record<string, unknown>)?.device_id
            ?? (user_event_props as Record<string, unknown>)?.deviceId
    );
    const device_id = normalizeDeviceId(req.body.device_id ?? req.body.deviceId) ?? propsDeviceId;

    const { data, error } = await supabaseClient
        .from('user_events')
        .insert([{
            user_event_name,
            user_event_props,
            auth_user_id: req.authUserId || null,
            device_id,
        }]);

    if (error) {
        console.error(`Error recording user event: ${error.message}`);
        return res.status(500).json({ error: 'Failed to record user event' });
    }

    return res.status(200).json(data);
}));

export default router;
