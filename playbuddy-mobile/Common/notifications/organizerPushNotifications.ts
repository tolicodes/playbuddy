import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import moment from 'moment-timezone';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../config';
import { logEvent } from '../hooks/logger';
import type { Event } from '../types/commonTypes';
import { UE } from '../types/userEventTypes';
import {
    buildNotificationHistoryId,
    getNotificationHistory,
    setNotificationHistory,
} from './notificationHistory';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const NOTIFICATION_TZ = 'America/New_York';
const NOTIFICATION_INTERVAL_SECONDS = 4 * 24 * 60 * 60;
const NOTIFICATION_INTERVAL_MS = NOTIFICATION_INTERVAL_SECONDS * 1000;
const NOTIFICATION_BATCH_COUNT = 5;
const NOTIFICATION_EVENT_WINDOW_START_DAYS = 2;
const NOTIFICATION_EVENT_WINDOW_END_DAYS = 10;
const NOTIFICATION_WINDOW_START_DAYS = 0;
const NOTIFICATION_WINDOW_END_DAYS = 28;

const PUSH_NOTIFICATIONS_ENABLED_KEY = 'pushNotificationsEnabled';
const PUSH_NOTIFICATIONS_PROMPTED_KEY = 'pushNotificationsPrompted';
const ORGANIZER_NOTIFICATION_IDS_KEY = 'organizerNotificationIds';
const ORGANIZER_NOTIFICATION_SCHEDULE_KEY = 'organizerNotificationSchedule';
const ORGANIZER_NOTIFICATION_LAST_SENT_KEY = 'organizerNotificationLastSentAt';
const DEFAULT_NOTIFICATION_CHANNEL_ID = 'default';
const REMOTE_PUSH_TOKEN_KEY = 'remotePushToken';

const parseStoredIds = (raw: string | null) => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
        return [];
    }
};

type OrganizerNotificationPlanItem = {
    sendAt: number;
    title: string;
    body: string;
    eventId?: number;
};

const parseStoredSchedule = (raw: string | null) => {
    if (!raw) return [] as OrganizerNotificationPlanItem[];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) => ({
                sendAt: Number(item?.sendAt),
                title: typeof item?.title === 'string' ? item.title : '',
                body: typeof item?.body === 'string' ? item.body : '',
                eventId:
                    typeof item?.eventId === 'number' && Number.isFinite(item.eventId)
                        ? item.eventId
                        : undefined,
            }))
            .filter((item) => Number.isFinite(item.sendAt) && item.title);
    } catch {
        return [];
    }
};

export const getOrganizerNotificationSchedule = async () => {
    const raw = await AsyncStorage.getItem(ORGANIZER_NOTIFICATION_SCHEDULE_KEY);
    return parseStoredSchedule(raw).sort((a, b) => a.sendAt - b.sendAt);
};

const setOrganizerNotificationSchedule = async (schedule: OrganizerNotificationPlanItem[]) => {
    await AsyncStorage.setItem(ORGANIZER_NOTIFICATION_SCHEDULE_KEY, JSON.stringify(schedule));
};

const getOrganizerNotificationLastSentAt = async () => {
    const raw = await AsyncStorage.getItem(ORGANIZER_NOTIFICATION_LAST_SENT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
};

const setOrganizerNotificationLastSentAt = async (timestamp: number) => {
    await AsyncStorage.setItem(ORGANIZER_NOTIFICATION_LAST_SENT_KEY, String(timestamp));
};

const isPermissionGranted = (settings: Notifications.NotificationPermissionsStatus) =>
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export const ensureNotificationPermissions = async () => {
    const current = await Notifications.getPermissionsAsync();
    if (isPermissionGranted(current)) return true;
    const requested = await Notifications.requestPermissionsAsync();
    const granted = isPermissionGranted(requested);
    if (granted) {
        logEvent(UE.NotificationsApprovalGranted);
    }
    return granted;
};

export const ensureNotificationChannel = async () => {
    if (Platform.OS !== 'android') return undefined;
    await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
    });
    return DEFAULT_NOTIFICATION_CHANNEL_ID;
};

export const getPushNotificationsEnabled = async () => {
    const stored = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_ENABLED_KEY);
    return stored === 'true';
};

export const setPushNotificationsEnabled = async (enabled: boolean) => {
    await AsyncStorage.setItem(PUSH_NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
};

export const getPushNotificationsPrompted = async () => {
    const stored = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_PROMPTED_KEY);
    return stored === 'true';
};

export const setPushNotificationsPrompted = async (prompted: boolean) => {
    await AsyncStorage.setItem(PUSH_NOTIFICATIONS_PROMPTED_KEY, prompted ? 'true' : 'false');
};

const getProjectId = () => {
    const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
    const fromEasConfig = Constants.easConfig?.projectId;
    return fromExpoConfig || fromEasConfig || undefined;
};

export const registerRemotePushToken = async () => {
    if (!Device.isDevice) {
        console.warn('[notifications] push tokens require a physical device');
        return null;
    }

    const permissionGranted = await ensureNotificationPermissions();
    if (!permissionGranted) return null;

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (!token) return null;

    const storedToken = await AsyncStorage.getItem(REMOTE_PUSH_TOKEN_KEY);
    if (storedToken === token) return token;

    await axios.post(`${API_BASE_URL}/push_tokens`, {
        token,
        platform: Platform.OS,
    });

    await AsyncStorage.setItem(REMOTE_PUSH_TOKEN_KEY, token);
    return token;
};

export const unregisterRemotePushToken = async () => {
    const token = await AsyncStorage.getItem(REMOTE_PUSH_TOKEN_KEY);
    if (!token) return;

    try {
        await axios.delete(`${API_BASE_URL}/push_tokens`, { data: { token } });
    } catch (error) {
        console.warn('[notifications] failed to unregister push token', error);
    } finally {
        await AsyncStorage.removeItem(REMOTE_PUSH_TOKEN_KEY);
    }
};

export const cancelOrganizerNotifications = async ({
    preserveLastSentAt = false,
    preserveSchedule = false,
} = {}) => {
    const stored = await AsyncStorage.getItem(ORGANIZER_NOTIFICATION_IDS_KEY);
    const ids = parseStoredIds(stored);
    await Promise.all(
        ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))
    );
    await AsyncStorage.removeItem(ORGANIZER_NOTIFICATION_IDS_KEY);
    if (!preserveSchedule) {
        await AsyncStorage.removeItem(ORGANIZER_NOTIFICATION_SCHEDULE_KEY);
    }
    if (!preserveLastSentAt) {
        await AsyncStorage.removeItem(ORGANIZER_NOTIFICATION_LAST_SENT_KEY);
    }
};

type OrganizerNotificationWindow = {
    windowStartDays?: number;
    windowEndDays?: number;
};

const getOrganizerNotificationEligibility = (
    events: Event[],
    followedOrganizerIds: Set<string>,
    window?: OrganizerNotificationWindow
) => {
    const now = moment().tz(NOTIFICATION_TZ);
    const windowStartDays = window?.windowStartDays ?? NOTIFICATION_WINDOW_START_DAYS;
    const windowEndDays = window?.windowEndDays ?? NOTIFICATION_WINDOW_END_DAYS;
    const windowStart = now.clone().add(windowStartDays, 'days').startOf('day');
    const windowEnd = now.clone().add(windowEndDays, 'days').endOf('day');

    if (!events.length || followedOrganizerIds.size === 0) {
        return {
            eligible: [] as { event: Event; start: moment.Moment }[],
            windowStart,
            windowEnd,
        };
    }

    const eligible = events
        .map((event) => {
            const organizerId = event.organizer?.id?.toString();
            if (!organizerId || !followedOrganizerIds.has(organizerId)) return null;
            const start = moment(event.start_date).tz(NOTIFICATION_TZ);
            if (!start.isValid()) return null;
            if (!start.isBetween(windowStart, windowEnd, undefined, '[]')) return null;
            return { event, start };
        })
        .filter((entry): entry is { event: Event; start: moment.Moment } => !!entry)
        .sort((a, b) => a.start.valueOf() - b.start.valueOf());

    return { eligible, windowStart, windowEnd };
};

const getOrganizerNotificationEvent = (
    events: Event[],
    followedOrganizerIds: Set<string>,
    window?: OrganizerNotificationWindow
) => {
    const { eligible } = getOrganizerNotificationEligibility(events, followedOrganizerIds, window);
    return eligible[0]?.event ?? null;
};

const hasPromoCodes = (event: Event) =>
    (event.promo_codes && event.promo_codes.length > 0) ||
    (event.organizer?.promo_codes && event.organizer.promo_codes.length > 0);

const getEventStart = (event: Event) => {
    const start = moment(event.start_date).tz(NOTIFICATION_TZ);
    return start.isValid() ? start : null;
};

const getNotificationWindowForSendAt = (sendAt: number) => {
    const base = moment(sendAt).tz(NOTIFICATION_TZ);
    return {
        windowStart: base.clone().add(NOTIFICATION_EVENT_WINDOW_START_DAYS, 'days').startOf('day'),
        windowEnd: base.clone().add(NOTIFICATION_EVENT_WINDOW_END_DAYS, 'days').endOf('day'),
    };
};

const getEligibleEventsInWindow = (
    events: Event[],
    windowStart: moment.Moment,
    windowEnd: moment.Moment
) => {
    return events
        .map((event) => {
            const start = getEventStart(event);
            if (!start) return null;
            if (!start.isBetween(windowStart, windowEnd, undefined, '[]')) return null;
            return { event, start };
        })
        .filter((entry): entry is { event: Event; start: moment.Moment } => !!entry)
        .sort((a, b) => a.start.valueOf() - b.start.valueOf());
};

const pickEventForNotification = ({
    eligible,
    followedOrganizerIds,
    usedEventIds,
}: {
    eligible: { event: Event; start: moment.Moment }[];
    followedOrganizerIds: Set<string>;
    usedEventIds: Set<number>;
}) => {
    const isFollowed = (event: Event) => {
        const organizerId = event.organizer?.id?.toString();
        return !!organizerId && followedOrganizerIds.has(organizerId);
    };

    const pickRandom = (candidates: { event: Event; start: moment.Moment }[]) => {
        if (!candidates.length) return null;
        const index = Math.floor(Math.random() * candidates.length);
        return candidates[index].event;
    };

    const pickPreferredRandom = (candidates: { event: Event; start: moment.Moment }[]) => {
        if (!candidates.length) return null;
        const followed = candidates.filter((entry) => isFollowed(entry.event));
        return pickRandom(followed.length ? followed : candidates);
    };

    const pickRandomFromEligible = (candidates: { event: Event; start: moment.Moment }[]) => {
        if (!candidates.length) return null;
        const remaining = candidates.filter((entry) => !usedEventIds.has(entry.event.id));
        return pickRandom(remaining.length ? remaining : candidates);
    };

    const promoEligible = eligible.filter((entry) => hasPromoCodes(entry.event));
    if (promoEligible.length) {
        // Keep promos if any exist in the window, even if it repeats an event.
        return pickRandomFromEligible(promoEligible);
    }

    const remaining = eligible.filter((entry) => !usedEventIds.has(entry.event.id));
    return pickPreferredRandom(remaining);
};

const computeNextOrganizerNotificationSendAt = async () => {
    const now = Date.now();
    const schedule = await getOrganizerNotificationSchedule();
    const storedLastSent = await getOrganizerNotificationLastSentAt();
    const lastFromSchedule = schedule.reduce((max, item) => {
        if (item.sendAt <= now && item.sendAt > max) return item.sendAt;
        return max;
    }, 0);
    let lastSentAt = Math.max(storedLastSent ?? 0, lastFromSchedule);
    if (!lastSentAt) {
        lastSentAt = now;
    }
    if (lastSentAt !== storedLastSent) {
        await setOrganizerNotificationLastSentAt(lastSentAt);
    }
    let nextSendAt = lastSentAt + NOTIFICATION_INTERVAL_MS;
    while (nextSendAt <= now) {
        nextSendAt += NOTIFICATION_INTERVAL_MS;
    }
    return { lastSentAt, nextSendAt };
};

const getNotificationImageUrl = (event: Event) => {
    const imageUrl = event.image_url?.trim();
    return imageUrl || null;
};

const syncOrganizerNotificationHistoryFromSchedule = async () => {
    const schedule = await getOrganizerNotificationSchedule();
    if (!schedule.length) return;
    const history = await getNotificationHistory();
    const now = Date.now();
    const nextHistory = [...history];
    const existingByEventId = new Map<number, number>();

    history.forEach((item, index) => {
        if (item.source !== 'organizer') return;
        if (typeof item.eventId !== 'number') return;
        if (!existingByEventId.has(item.eventId)) {
            existingByEventId.set(item.eventId, index);
        }
    });

    let updated = false;

    schedule.forEach((item) => {
        if (typeof item.eventId !== 'number') return;
        const existingIndex = existingByEventId.get(item.eventId);
        if (existingIndex !== undefined) {
            const existing = nextHistory[existingIndex];
            if (
                existing.createdAt !== item.sendAt ||
                existing.title !== item.title ||
                existing.body !== item.body
            ) {
                nextHistory[existingIndex] = {
                    ...existing,
                    createdAt: item.sendAt,
                    title: item.title,
                    body: item.body,
                };
                updated = true;
            }
            return;
        }
        if (item.sendAt > now) return;
        nextHistory.push({
            id: buildNotificationHistoryId('organizer', item.sendAt),
            title: item.title,
            body: item.body,
            createdAt: item.sendAt,
            source: 'organizer',
            eventId: item.eventId,
        });
        updated = true;
    });

    if (updated) {
        await setNotificationHistory(nextHistory);
    }
};

const getPromoLabel = (event: Event) => {
    const promoCode =
        event.promo_codes?.find((code) => code.scope === 'event') ||
        event.organizer?.promo_codes?.find((code) => code.scope === 'organizer') ||
        event.promo_codes?.[0] ||
        event.organizer?.promo_codes?.[0];
    if (!promoCode) return null;
    if (promoCode.discount_type === 'percent') {
        return `${promoCode.discount}% off`;
    }
    return `$${promoCode.discount} off`;
};

export const getOrganizerNotificationPreview = (event: Event) => {
    const start = moment(event.start_date).tz(NOTIFICATION_TZ);
    const dateLabel = start.isValid() ? start.format('ddd M/D') : 'Upcoming';
    const organizerName = event.organizer?.name?.trim() || 'Organizer';
    const promoLabel = getPromoLabel(event);
    const imageUrl = getNotificationImageUrl(event);
    const title = promoLabel
        ? `${dateLabel} ${organizerName} - ${promoLabel}`
        : `${dateLabel} ${organizerName}`;
    return {
        title,
        body: event.name,
        imageUrl,
    };
};

const buildOrganizerNotificationContent = (event: Event) => {
    const preview = getOrganizerNotificationPreview(event);
    const content: Notifications.NotificationContentInput = {
        title: preview.title,
        body: preview.body,
        data: {
            eventId: event.id,
            source: 'organizer',
            imageUrl: preview.imageUrl,
        },
    };
    if (preview.imageUrl && Platform.OS === 'ios') {
        content.attachments = [{ url: preview.imageUrl }];
    }
    return {
        ...content,
    };
};

export const getOrganizerNotificationCandidate = ({
    events,
    followedOrganizerIds,
    sendAt,
}: {
    events: Event[];
    followedOrganizerIds: Set<string>;
    sendAt?: number;
}) => {
    const targetSendAt = sendAt ?? Date.now();
    const { windowStart, windowEnd } = getNotificationWindowForSendAt(targetSendAt);
    const eligible = getEligibleEventsInWindow(events, windowStart, windowEnd);
    const event = pickEventForNotification({
        eligible,
        followedOrganizerIds,
        usedEventIds: new Set(),
    });
    if (!event) return null;
    const content = buildOrganizerNotificationContent(event);
    return { event, content };
};

export const getOrganizerNotificationEligibilityInfo = ({
    events,
    followedOrganizerIds,
    windowStartDays,
    windowEndDays,
}: {
    events: Event[];
    followedOrganizerIds: Set<string>;
    windowStartDays?: number;
    windowEndDays?: number;
}) => {
    const { eligible, windowStart, windowEnd } = getOrganizerNotificationEligibility(
        events,
        followedOrganizerIds,
        { windowStartDays, windowEndDays }
    );
    const candidate = eligible[0];
    return {
        eligibleCount: eligible.length,
        windowStart: windowStart.format('YYYY-MM-DD'),
        windowEnd: windowEnd.format('YYYY-MM-DD'),
        candidateEvent: candidate?.event ?? null,
        candidateStart: candidate?.start?.isValid()
            ? candidate.start.format('YYYY-MM-DD HH:mm')
            : null,
    };
};

export const scheduleOrganizerNotifications = async ({
    events,
    followedOrganizerIds,
}: {
    events: Event[];
    followedOrganizerIds: Set<string>;
}) => {
    const settings = await Notifications.getPermissionsAsync();
    if (!isPermissionGranted(settings)) {
        await cancelOrganizerNotifications();
        return [];
    }

    await syncOrganizerNotificationHistoryFromSchedule();

    const { nextSendAt } = await computeNextOrganizerNotificationSendAt();
    await cancelOrganizerNotifications({ preserveLastSentAt: true, preserveSchedule: true });

    const scheduledIds: string[] = [];
    const scheduledPlan: OrganizerNotificationPlanItem[] = [];
    const usedEventIds = new Set<number>();
    const channelId = await ensureNotificationChannel();

    for (let index = 0; index < NOTIFICATION_BATCH_COUNT; index += 1) {
        const sendAt = nextSendAt + index * NOTIFICATION_INTERVAL_MS;
        const { windowStart, windowEnd } = getNotificationWindowForSendAt(sendAt);
        const eligible = getEligibleEventsInWindow(events, windowStart, windowEnd);
        const event = pickEventForNotification({
            eligible,
            followedOrganizerIds,
            usedEventIds,
        });

        if (!event) {
            scheduledPlan.push({
                sendAt,
                title: 'No eligible events',
                body: 'No event found 5-10 days after this send date.',
            });
            continue;
        }

        usedEventIds.add(event.id);
        const content = buildOrganizerNotificationContent(event);
        const contentWithMetadata = {
            ...content,
            data: {
                ...content.data,
                sendAt,
            },
        };
        scheduledPlan.push({
            sendAt,
            title: content.title || 'Notification',
            body: content.body || '',
            eventId: event.id,
        });

        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: contentWithMetadata,
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: sendAt,
                    ...(channelId ? { channelId } : {}),
                },
            });
            scheduledIds.push(id);
        } catch (error) {
            console.warn('scheduleOrganizerNotifications: failed to schedule', error);
        }
    }

    await AsyncStorage.setItem(ORGANIZER_NOTIFICATION_IDS_KEY, JSON.stringify(scheduledIds));
    await setOrganizerNotificationSchedule(scheduledPlan);
    return scheduledPlan;
};
