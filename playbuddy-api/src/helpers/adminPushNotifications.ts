import fetch from 'node-fetch';
import { supabaseClient } from '../connections/supabaseClient.js';
import { ADMIN_EMAILS } from '../config.js';

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
const ADMIN_ID_CACHE_TTL_MS = 5 * 60 * 1000;

const adminIdCache: { ids: string[]; fetchedAt: number } = {
    ids: [],
    fetchedAt: 0,
};

const isExpoPushToken = (token: string) =>
    token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

const chunk = <T>(items: T[], size: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const sendExpoPushMessages = async (messages: ExpoPushMessage[]) => {
    const results: { token: string; ticket: ExpoPushTicket }[] = [];
    const batches = chunk(messages, EXPO_CHUNK_SIZE);

    for (const batch of batches) {
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch),
            });

            const payload = (await response.json().catch(() => null)) as ExpoPushResponse | null;
            const data = Array.isArray(payload?.data) ? payload.data : null;

            if (!response.ok || !data || data.length !== batch.length) {
                const errorMessage =
                    payload?.errors?.map((err) => err?.message).filter(Boolean).join('; ')
                    || `Expo push request failed (${response.status})`;
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

const fetchAdminAuthUserIds = async () => {
    const now = Date.now();
    if (adminIdCache.ids.length && now - adminIdCache.fetchedAt < ADMIN_ID_CACHE_TTL_MS) {
        return adminIdCache.ids;
    }

    const adminEmails = new Set(ADMIN_EMAILS.map((email) => email.toLowerCase()));
    const resolved = new Set<string>();
    let page = 1;
    const perPage = 200;

    while (resolved.size < adminEmails.size) {
        const { data, error } = await supabaseClient.auth.admin.listUsers({ page, perPage });
        if (error) {
            console.warn(`Failed to list auth users for admin push notifications: ${error.message}`);
            break;
        }

        const users = (data as any)?.users ?? [];
        users.forEach((user: any) => {
            const email = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
            if (email && adminEmails.has(email)) {
                resolved.add(user.id);
            }
        });

        if (users.length < perPage) break;
        page += 1;
    }

    const ids = Array.from(resolved);
    adminIdCache.ids = ids;
    adminIdCache.fetchedAt = now;
    return ids;
};

const fetchAdminPushTokens = async () => {
    const adminUserIds = await fetchAdminAuthUserIds();
    if (!adminUserIds.length) return [];

    const { data, error } = await supabaseClient
        .from('push_tokens')
        .select('token')
        .is('disabled_at', null)
        .in('auth_user_id', adminUserIds);

    if (error) {
        console.warn(`Failed to fetch admin push tokens: ${error.message}`);
        return [];
    }

    const rawTokens = (data ?? [])
        .map((item: any) => item?.token)
        .filter((token: any): token is string => typeof token === 'string' && token.length > 0);

    if (!rawTokens.length) return [];

    const invalidTokens = rawTokens.filter((token) => !isExpoPushToken(token));
    const validTokens = rawTokens.filter((token) => isExpoPushToken(token));

    if (invalidTokens.length) {
        await disablePushTokens(invalidTokens, 'invalid_format');
    }

    return validTokens;
};

const logAdminNotification = async ({
    title,
    body,
    eventId,
    sentCount,
    failedCount,
    lastError,
}: {
    title: string;
    body: string;
    eventId?: number | null;
    sentCount: number;
    failedCount: number;
    lastError?: string | null;
}) => {
    const now = new Date().toISOString();
    const { error } = await supabaseClient
        .from('push_notifications')
        .insert({
            title,
            body,
            status: 'sent',
            event_id: eventId ?? null,
            send_at: now,
            sent_at: now,
            sent_count: sentCount,
            failed_count: failedCount,
            last_error: lastError ?? null,
            created_at: now,
            updated_at: now,
        });

    if (error) {
        console.warn(`Failed to log admin notification: ${error.message}`);
    }
};

export const notifyAdminsOfPendingEvents = async ({
    count,
    eventName,
    eventId,
}: {
    count: number;
    eventName?: string | null;
    eventId?: number | null;
}) => {
    if (!Number.isFinite(count) || count <= 0) return;

    const title = count === 1 ? 'New event submission' : `${count} new event submissions`;
    const body = count === 1
        ? (eventName ? `Review "${eventName}".` : 'Review the new event submission.')
        : `Review ${count} new event submissions.`;
    const logTitle = `Admin review: ${title}`;

    const tokens = await fetchAdminPushTokens();
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const deviceNotRegistered: string[] = [];

    if (tokens.length) {
        const messages: ExpoPushMessage[] = tokens.map((token) => ({
            to: token,
            sound: 'default',
            title,
            body,
            channelId: 'default',
            data: {
                source: 'admin_review',
                count,
                eventId: eventId ?? undefined,
            },
        }));

        const results = await sendExpoPushMessages(messages);

        results.forEach(({ token, ticket }) => {
            if (ticket.status === 'ok') {
                sentCount += 1;
                return;
            }
            failedCount += 1;
            if (ticket.details?.error === 'DeviceNotRegistered') {
                deviceNotRegistered.push(token);
            }
            if (ticket.message) errors.push(ticket.message);
        });

        if (deviceNotRegistered.length) {
            await disablePushTokens(deviceNotRegistered, 'device_not_registered');
        }

        if (errors.length) {
            console.warn(`[admin-push] ${errors.slice(0, 3).join(' | ')}`);
        }
    } else {
        errors.push('No admin push tokens');
    }

    await logAdminNotification({
        title: logTitle,
        body,
        eventId,
        sentCount,
        failedCount,
        lastError: errors.length ? errors.slice(0, 3).join(' | ') : null,
    });
};
