import { Router, Response } from 'express';
import fetch from 'node-fetch';
import { supabaseClient } from '../connections/supabaseClient.js';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import asyncHandler from './helpers/asyncHandler.js';

const router = Router();

type PushNotificationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'canceled';

type PushNotificationRecord = {
    id: string;
    event_id: number | null;
    title: string;
    body: string;
    image_url: string | null;
    status: PushNotificationStatus;
    send_at: string | null;
    sent_at: string | null;
    sent_count: number | null;
    failed_count: number | null;
    last_error: string | null;
    created_at: string;
    updated_at: string | null;
};

type ExpoPushTicket = {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string; [key: string]: any };
};

type ExpoPushMessage = {
    to: string;
    sound?: 'default';
    title?: string;
    body?: string;
    data?: Record<string, any>;
    channelId?: string;
};

type ExpoPushResponse = {
    data?: ExpoPushTicket[];
    errors?: Array<{ message?: string }>;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_CHUNK_SIZE = 100;

const VALID_STATUSES = new Set<PushNotificationStatus>([
    'draft',
    'scheduled',
    'sending',
    'sent',
    'failed',
    'canceled',
]);

const normalizeStatus = (value: unknown): PushNotificationStatus | undefined => {
    if (typeof value !== 'string') return undefined;
    return VALID_STATUSES.has(value as PushNotificationStatus) ? (value as PushNotificationStatus) : undefined;
};

const normalizeRequiredText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeOptionalText = (value: unknown) => {
    if (value === null) return null;
    if (value === undefined) return undefined;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};

const parseDateInput = (value: unknown): { provided: boolean; value: string | null } | null => {
    if (value === undefined) return { provided: false, value: null };
    if (value === null || value === '') return { provided: true, value: null };
    const date = new Date(value as any);
    if (Number.isNaN(date.getTime())) return null;
    return { provided: true, value: date.toISOString() };
};

const parseEventId = (value: unknown): { provided: boolean; value: number | null } | null => {
    if (value === undefined) return { provided: false, value: null };
    if (value === null || value === '') return { provided: true, value: null };
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return { provided: true, value: parsed };
};

const chunk = <T>(items: T[], size: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const isExpoPushToken = (token: string) =>
    token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

const sendExpoPushMessages = async (messages: ExpoPushMessage[]) => {
    const results: { token: string; ticket: ExpoPushTicket }[] = [];
    const batches = chunk(messages, EXPO_CHUNK_SIZE);

    for (const batch of batches) {
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batch),
            });

            const payload = (await response.json().catch(() => null)) as ExpoPushResponse | null;
            const data = Array.isArray(payload?.data) ? payload.data : null;

            if (!response.ok || !data || data.length !== batch.length) {
                const errorMessage =
                    payload?.errors?.map((err: any) => err?.message).filter(Boolean).join('; ') ||
                    `Expo push request failed (${response.status})`;
                batch.forEach((message) => {
                    results.push({
                        token: message.to,
                        ticket: { status: 'error', message: errorMessage },
                    });
                });
                continue;
            }

            data.forEach((ticket: ExpoPushTicket, index: number) => {
                results.push({ token: batch[index].to, ticket });
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            batch.forEach((item) => {
                results.push({ token: item.to, ticket: { status: 'error', message } });
            });
        }
    }

    return results;
};

const disablePushTokens = async (tokens: string[], reason: string) => {
    if (!tokens.length) return;
    const now = new Date().toISOString();
    const { error } = await supabaseClient
        .from('push_tokens')
        .update({ disabled_at: now, disable_reason: reason, updated_at: now })
        .in('token', tokens);

    if (error) {
        console.warn(`Failed to disable push tokens (${reason}): ${error.message}`);
    }
};

const sendNotificationToAllTokens = async (notification: PushNotificationRecord) => {
    const { data: tokens, error } = await supabaseClient
        .from('push_tokens')
        .select('token')
        .is('disabled_at', null);

    if (error) {
        throw new Error(`Failed to fetch push tokens: ${error.message}`);
    }

    const rawTokens = (tokens ?? [])
        .map((item) => item.token)
        .filter((token): token is string => typeof token === 'string' && token.length > 0);

    if (!rawTokens.length) {
        return {
            sentCount: 0,
            failedCount: 0,
            errors: ['No active push tokens'],
        };
    }

    const invalidFormatTokens = rawTokens.filter((token) => !isExpoPushToken(token));
    const validTokens = rawTokens.filter((token) => isExpoPushToken(token));

    if (invalidFormatTokens.length) {
        await disablePushTokens(invalidFormatTokens, 'invalid_format');
    }

    if (!validTokens.length) {
        return {
            sentCount: 0,
            failedCount: rawTokens.length,
            errors: ['No valid Expo push tokens'],
        };
    }

    const eventId =
        typeof notification.event_id === 'number' && Number.isFinite(notification.event_id)
            ? notification.event_id
            : undefined;

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        channelId: 'default',
        data: {
            notificationId: notification.id,
            imageUrl: notification.image_url ?? null,
            source: 'broadcast',
            eventId,
        },
    }));

    const results = await sendExpoPushMessages(messages);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const deviceNotRegistered: string[] = [];

    results.forEach(({ token, ticket }) => {
        if (ticket.status === 'ok') {
            sentCount += 1;
            return;
        }
        failedCount += 1;
        if (ticket.message) errors.push(ticket.message);
        if (ticket.details?.error === 'DeviceNotRegistered') {
            deviceNotRegistered.push(token);
        }
    });

    if (deviceNotRegistered.length) {
        await disablePushTokens(deviceNotRegistered, 'device_not_registered');
    }

    return {
        sentCount,
        failedCount,
        errors,
    };
};

const finalizeNotification = async (
    id: string,
    {
        sentCount,
        failedCount,
        errors,
    }: {
        sentCount: number;
        failedCount: number;
        errors: string[];
    }
) => {
    const now = new Date().toISOString();
    const status: PushNotificationStatus = sentCount > 0 ? 'sent' : 'failed';
    const lastError = errors.length ? errors.slice(0, 3).join(' | ') : null;

    const { data, error } = await supabaseClient
        .from('push_notifications')
        .update({
            status,
            sent_at: status === 'sent' ? now : null,
            sent_count: sentCount,
            failed_count: failedCount,
            last_error: lastError,
            updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to update push notification status: ${error.message}`);
    }

    return data as PushNotificationRecord;
};

const claimNotificationForSend = async (id: string, sendAt?: string | null, allowed?: PushNotificationStatus[]) => {
    const now = new Date().toISOString();
    const allowedStatuses = allowed ?? ['draft', 'scheduled', 'failed'];

    const updates: Record<string, any> = {
        status: 'sending',
        updated_at: now,
    };
    if (sendAt !== undefined) {
        updates.send_at = sendAt ?? now;
    }

    const { data, error } = await supabaseClient
        .from('push_notifications')
        .update(updates)
        .eq('id', id)
        .in('status', allowedStatuses)
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to claim push notification: ${error.message}`);
    }

    if (!data) {
        throw new Error('Push notification is not available to send');
    }

    return data as PushNotificationRecord;
};

router.get('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = normalizeStatus(req.query.status);

    let query = supabaseClient
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch push notifications: ${error.message}`);
    }

    res.json(data ?? []);
}));

router.post('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const title = normalizeRequiredText(body.title);
    const notificationBody = normalizeRequiredText(body.body ?? body.description);
    const imageUrl = normalizeOptionalText(body.image_url ?? body.imageUrl);
    const status = normalizeStatus(body.status) ?? 'draft';
    const sendAtInfo = parseDateInput(body.send_at ?? body.sendAt);
    const eventIdInfo = parseEventId(body.event_id ?? body.eventId);

    if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
    }

    if (!notificationBody) {
        res.status(400).json({ error: 'body is required' });
        return;
    }

    if (!sendAtInfo) {
        res.status(400).json({ error: 'send_at must be a valid date' });
        return;
    }

    if (!eventIdInfo) {
        res.status(400).json({ error: 'event_id must be a number' });
        return;
    }

    if (status === 'scheduled' && !sendAtInfo.value) {
        res.status(400).json({ error: 'send_at is required for scheduled notifications' });
        return;
    }

    const now = new Date().toISOString();
    const payload: Record<string, any> = {
        title,
        body: notificationBody,
        status,
        created_by_auth_user_id: req.authUserId ?? null,
        created_at: now,
        updated_at: now,
    };

    if (imageUrl !== undefined) {
        payload.image_url = imageUrl;
    }

    if (eventIdInfo.provided) {
        payload.event_id = eventIdInfo.value;
    }

    if (sendAtInfo.provided) {
        payload.send_at = sendAtInfo.value;
    }

    const { data, error } = await supabaseClient
        .from('push_notifications')
        .insert(payload)
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to create push notification: ${error.message}`);
    }

    res.json(data);
}));

router.patch('/:id', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const body = req.body || {};
    const updates: Record<string, any> = {};

    if (body.title !== undefined) {
        const title = normalizeRequiredText(body.title);
        if (!title) {
            res.status(400).json({ error: 'title cannot be empty' });
            return;
        }
        updates.title = title;
    }

    if (body.body !== undefined || body.description !== undefined) {
        const notificationBody = normalizeRequiredText(body.body ?? body.description);
        if (!notificationBody) {
            res.status(400).json({ error: 'body cannot be empty' });
            return;
        }
        updates.body = notificationBody;
    }

    if (body.image_url !== undefined || body.imageUrl !== undefined) {
        updates.image_url = normalizeOptionalText(body.image_url ?? body.imageUrl);
    }

    const eventIdInfo = parseEventId(body.event_id ?? body.eventId);
    if (!eventIdInfo) {
        res.status(400).json({ error: 'event_id must be a number' });
        return;
    }
    if (eventIdInfo.provided) {
        updates.event_id = eventIdInfo.value;
    }

    if (body.status !== undefined) {
        const status = normalizeStatus(body.status);
        if (!status) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        updates.status = status;
    }

    const sendAtInfo = parseDateInput(body.send_at ?? body.sendAt);
    if (!sendAtInfo) {
        res.status(400).json({ error: 'send_at must be a valid date' });
        return;
    }
    if (sendAtInfo.provided) {
        updates.send_at = sendAtInfo.value;
    }

    if (updates.status === 'scheduled') {
        if (updates.send_at === null) {
            res.status(400).json({ error: 'send_at is required for scheduled notifications' });
            return;
        }
        if (updates.send_at === undefined) {
            const { data, error } = await supabaseClient
                .from('push_notifications')
                .select('send_at')
                .eq('id', id)
                .single();

            if (error) {
                throw new Error(`Failed to fetch push notification: ${error.message}`);
            }

            if (!data?.send_at) {
                res.status(400).json({ error: 'send_at is required for scheduled notifications' });
                return;
            }
        }
    }

    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No fields provided to update' });
        return;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseClient
        .from('push_notifications')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to update push notification: ${error.message}`);
    }

    res.json(data);
}));

router.post('/:id/send', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const now = new Date().toISOString();

    let notification: PushNotificationRecord;
    try {
        notification = await claimNotificationForSend(id, now);
    } catch (err) {
        res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to send notification' });
        return;
    }

    let summary: { sentCount: number; failedCount: number; errors: string[] };
    try {
        summary = await sendNotificationToAllTokens(notification);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const fallback = await finalizeNotification(notification.id, {
            sentCount: 0,
            failedCount: 0,
            errors: [message],
        });
        res.status(500).json(fallback);
        return;
    }

    const updated = await finalizeNotification(notification.id, summary);
    res.json(updated);
}));

router.post('/flush', authenticateAdminRequest, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const now = new Date().toISOString();
    const { data: due, error } = await supabaseClient
        .from('push_notifications')
        .select('*')
        .eq('status', 'scheduled')
        .lte('send_at', now)
        .order('send_at', { ascending: true });

    if (error) {
        throw new Error(`Failed to fetch scheduled push notifications: ${error.message}`);
    }

    const results: PushNotificationRecord[] = [];
    const errors: string[] = [];

    for (const item of due ?? []) {
        let claimed: PushNotificationRecord | null = null;
        try {
            claimed = await claimNotificationForSend(item.id, item.send_at ?? now, ['scheduled']);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push(`${item.id}: ${message}`);
            continue;
        }

        try {
            const summary = await sendNotificationToAllTokens(claimed);
            const updated = await finalizeNotification(claimed.id, summary);
            results.push(updated);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (claimed) {
                try {
                    const updated = await finalizeNotification(claimed.id, {
                        sentCount: 0,
                        failedCount: 0,
                        errors: [message],
                    });
                    results.push(updated);
                } catch (finalErr) {
                    const finalMessage = finalErr instanceof Error ? finalErr.message : String(finalErr);
                    errors.push(`${item.id}: ${finalMessage}`);
                }
            }
            errors.push(`${item.id}: ${message}`);
        }
    }

    res.json({
        processed: results.length,
        failed: errors.length,
        errors,
        notifications: results,
    });
}));

export default router;
