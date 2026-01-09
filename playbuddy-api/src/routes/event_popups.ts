import { Router, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import asyncHandler from './helpers/asyncHandler.js';

const router = Router();

type EventPopupStatus = 'draft' | 'published' | 'stopped';

const EVENT_SELECT = `
    *,
    organizer:organizer_id(*),
    location_area:location_areas(id, name)
`;

const POPUP_SELECT = '*';

const VALID_STATUSES = new Set<EventPopupStatus>(['draft', 'published', 'stopped']);

const normalizeStatus = (value: unknown): EventPopupStatus | undefined => {
    if (typeof value !== 'string') return undefined;
    return VALID_STATUSES.has(value as EventPopupStatus) ? (value as EventPopupStatus) : undefined;
};

const parseEventId = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseOptionalDate = (value: unknown) => {
    if (value === undefined) return { value: undefined as string | null | undefined, error: false };
    if (value === null || value === '') return { value: null as string | null, error: false };
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return { value: null as string | null, error: true };
    return { value: parsed.toISOString(), error: false };
};

const attachEvents = async (popups: any[]) => {
    const eventIds = Array.from(new Set(
        popups
            .map((popup) => popup.event_id)
            .filter((id) => Number.isFinite(Number(id)))
            .map((id) => Number(id))
    ));

    if (eventIds.length === 0) return popups;

    const { data: events, error } = await supabaseClient
        .from('events')
        .select(EVENT_SELECT)
        .in('id', eventIds);

    if (error) {
        throw new Error(`Failed to fetch popup events: ${error.message}`);
    }

    const eventMap = new Map<number, any>();
    (events ?? []).forEach((event) => {
        eventMap.set(event.id, event);
    });

    return popups.map((popup) => ({
        ...popup,
        event: eventMap.get(Number(popup.event_id)) ?? null,
    }));
};

router.get('/active', asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseClient
        .from('event_popups')
        .select(POPUP_SELECT)
        .eq('status', 'published')
        .is('stopped_at', null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .or(`published_at.is.null,published_at.lte.${nowIso}`)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(`Failed to fetch event popups: ${error.message}`);
    }

    const hydrated = await attachEvents(data ?? []);
    res.json(hydrated);
}));

router.get('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = normalizeStatus(req.query.status);

    let query = supabaseClient
        .from('event_popups')
        .select(POPUP_SELECT)
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch event popups: ${error.message}`);
    }

    const hydrated = await attachEvents(data ?? []);
    res.json(hydrated);
}));

router.post('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const eventId = parseEventId(body.event_id ?? body.eventId);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const bodyMarkdown = typeof body.body_markdown === 'string'
        ? body.body_markdown.trim()
        : typeof body.bodyMarkdown === 'string'
            ? body.bodyMarkdown.trim()
            : '';
    const publishedAtInput = parseOptionalDate(body.published_at ?? body.publishedAt);
    const expiresAtInput = parseOptionalDate(body.expires_at ?? body.expiresAt);

    if (!eventId) {
        res.status(400).json({ error: 'event_id is required' });
        return;
    }

    if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
    }

    if (!bodyMarkdown) {
        res.status(400).json({ error: 'body_markdown is required' });
        return;
    }

    if (publishedAtInput.error) {
        res.status(400).json({ error: 'published_at must be a valid date' });
        return;
    }

    if (expiresAtInput.error) {
        res.status(400).json({ error: 'expires_at must be a valid date' });
        return;
    }

    const status = normalizeStatus(body.status) ?? 'draft';
    const now = new Date().toISOString();

    const payload: Record<string, any> = {
        event_id: eventId,
        title,
        body_markdown: bodyMarkdown,
        status,
        updated_at: now,
    };

    if (status === 'published') {
        payload.published_at = publishedAtInput.value ?? now;
        payload.stopped_at = null;
    }

    if (status === 'stopped') {
        payload.stopped_at = now;
    }

    if (expiresAtInput.value !== undefined) {
        payload.expires_at = expiresAtInput.value;
    }

    const { data, error } = await supabaseClient
        .from('event_popups')
        .insert(payload)
        .select(POPUP_SELECT)
        .single();

    if (error) {
        throw new Error(`Failed to create event popup: ${error.message}`);
    }

    const hydrated = await attachEvents([data]);
    res.json(hydrated[0] ?? data);
}));

router.patch('/:id', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const body = req.body || {};
    const updates: Record<string, any> = {};

    if (body.title !== undefined) {
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
            res.status(400).json({ error: 'title cannot be empty' });
            return;
        }
        updates.title = title;
    }

    if (body.body_markdown !== undefined || body.bodyMarkdown !== undefined) {
        const markdown = typeof body.body_markdown === 'string'
            ? body.body_markdown.trim()
            : typeof body.bodyMarkdown === 'string'
                ? body.bodyMarkdown.trim()
                : '';
        if (!markdown) {
            res.status(400).json({ error: 'body_markdown cannot be empty' });
            return;
        }
        updates.body_markdown = markdown;
    }

    if (body.event_id !== undefined || body.eventId !== undefined) {
        const eventId = parseEventId(body.event_id ?? body.eventId);
        if (!eventId) {
            res.status(400).json({ error: 'event_id must be a number' });
            return;
        }
        updates.event_id = eventId;
    }

    if (body.published_at !== undefined || body.publishedAt !== undefined) {
        const publishedAtInput = parseOptionalDate(body.published_at ?? body.publishedAt);
        if (publishedAtInput.error) {
            res.status(400).json({ error: 'published_at must be a valid date' });
            return;
        }
        updates.published_at = publishedAtInput.value;
    }

    if (body.expires_at !== undefined || body.expiresAt !== undefined) {
        const expiresAtInput = parseOptionalDate(body.expires_at ?? body.expiresAt);
        if (expiresAtInput.error) {
            res.status(400).json({ error: 'expires_at must be a valid date' });
            return;
        }
        updates.expires_at = expiresAtInput.value;
    }

    if (body.status !== undefined) {
        const status = normalizeStatus(body.status);
        if (!status) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        updates.status = status;
        const now = new Date().toISOString();
        if (status === 'published') {
            if (updates.published_at === undefined || updates.published_at === null) {
                updates.published_at = now;
            }
            updates.stopped_at = null;
        } else if (status === 'stopped') {
            updates.stopped_at = now;
        } else if (status === 'draft') {
            updates.published_at = null;
            updates.stopped_at = null;
        }
    }

    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No fields provided to update' });
        return;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseClient
        .from('event_popups')
        .update(updates)
        .eq('id', id)
        .select(POPUP_SELECT)
        .single();

    if (error) {
        throw new Error(`Failed to update event popup: ${error.message}`);
    }

    const hydrated = await attachEvents([data]);
    res.json(hydrated[0] ?? data);
}));

export default router;
