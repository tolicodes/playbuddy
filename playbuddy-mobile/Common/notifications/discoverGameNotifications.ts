import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { Event } from '../../commonTypes';
import { ensureNotificationPermissions } from './organizerPushNotifications';

type EventWithTimestamps = Event & {
    created_at?: string | null;
    createdAt?: string | null;
};

const DISCOVER_GAME_NOTIFICATIONS_ENABLED_KEY = 'discoverGameNotificationsEnabled';
const DISCOVER_GAME_NOTIFICATIONS_PROMPTED_KEY = 'discoverGameNotificationsPrompted';
const DISCOVER_GAME_SWIPE_COUNT_KEY = 'discoverGameSwipeCount';
const DISCOVER_GAME_LAST_SWIPE_AT_KEY = 'discoverGameLastSwipeAt';
const DISCOVER_GAME_NOTIFICATION_IDS_KEY = 'discoverGameNotificationIds';

const NOTIFICATION_INTERVAL_DAYS = 3;
const REMINDER_INTERVAL_DAYS = 30;
const INACTIVITY_DAYS = 14;
const NOTIFICATION_INTERVAL_MS = NOTIFICATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
const REMINDER_INTERVAL_MS = REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
const REMINDER_BATCH_COUNT = 6;
const DISCOVER_GAME_CHANNEL_ID = 'discover-game';

let promptInFlight = false;

const parseStoredIds = (raw: string | null) => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
        return [];
    }
};

const parseStoredNumber = (raw: string | null) => {
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const parseTimestamp = (value?: string | null) => {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const getEventCreatedAt = (event: EventWithTimestamps) => {
    const createdAt = parseTimestamp(event.created_at) ?? parseTimestamp(event.createdAt);
    return createdAt ?? parseTimestamp(event.start_date);
};

const buildUpcomingNotificationTimes = (lastSwipeAt: number, now: number) => {
    const times: number[] = [];
    const endAt = lastSwipeAt + INACTIVITY_MS;
    for (let sendAt = lastSwipeAt + NOTIFICATION_INTERVAL_MS; sendAt <= endAt; sendAt += NOTIFICATION_INTERVAL_MS) {
        if (sendAt > now) {
            times.push(sendAt);
        }
    }
    return times;
};

const buildMonthlyReminderTimes = (lastSwipeAt: number, now: number) => {
    const times: number[] = [];
    const startAt = lastSwipeAt + INACTIVITY_MS;
    let nextSendAt = startAt;

    if (now > startAt) {
        const elapsed = now - startAt;
        const intervals = Math.floor(elapsed / REMINDER_INTERVAL_MS) + 1;
        nextSendAt = startAt + intervals * REMINDER_INTERVAL_MS;
    }

    for (let index = 0; index < REMINDER_BATCH_COUNT; index += 1) {
        times.push(nextSendAt + index * REMINDER_INTERVAL_MS);
    }

    return times;
};

const isPermissionGranted = (settings: Notifications.NotificationPermissionsStatus) =>
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

const ensureDiscoverGameNotificationChannel = async () => {
    if (Platform.OS !== 'android') return undefined;
    await Notifications.setNotificationChannelAsync(DISCOVER_GAME_CHANNEL_ID, {
        name: 'Discover Game',
        importance: Notifications.AndroidImportance.DEFAULT,
    });
    return DISCOVER_GAME_CHANNEL_ID;
};

export const getDiscoverGameNotificationsEnabled = async () => {
    const stored = await AsyncStorage.getItem(DISCOVER_GAME_NOTIFICATIONS_ENABLED_KEY);
    return stored === 'true';
};

export const setDiscoverGameNotificationsEnabled = async (enabled: boolean) => {
    await AsyncStorage.setItem(DISCOVER_GAME_NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
};

export const getDiscoverGameNotificationsPrompted = async () => {
    const stored = await AsyncStorage.getItem(DISCOVER_GAME_NOTIFICATIONS_PROMPTED_KEY);
    return stored === 'true';
};

export const setDiscoverGameNotificationsPrompted = async (prompted: boolean) => {
    await AsyncStorage.setItem(DISCOVER_GAME_NOTIFICATIONS_PROMPTED_KEY, prompted ? 'true' : 'false');
};

export const cancelDiscoverGameNotifications = async () => {
    const stored = await AsyncStorage.getItem(DISCOVER_GAME_NOTIFICATION_IDS_KEY);
    const ids = parseStoredIds(stored);
    await Promise.all(
        ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))
    );
    await AsyncStorage.removeItem(DISCOVER_GAME_NOTIFICATION_IDS_KEY);
};

export const recordDiscoverGameSwipe = async () => {
    const storedCount = await AsyncStorage.getItem(DISCOVER_GAME_SWIPE_COUNT_KEY);
    const nextCount = parseStoredNumber(storedCount) + 1;
    const now = Date.now();

    await AsyncStorage.multiSet([
        [DISCOVER_GAME_SWIPE_COUNT_KEY, String(nextCount)],
        [DISCOVER_GAME_LAST_SWIPE_AT_KEY, String(now)],
    ]);

    await Notifications.setBadgeCountAsync(0).catch(() => undefined);

    return nextCount;
};

export const promptDiscoverGameNotifications = async ({
    availableCardsToSwipe,
}: {
    availableCardsToSwipe: Event[];
}) => {
    if (promptInFlight) return;
    promptInFlight = true;

    const [enabled, prompted] = await Promise.all([
        getDiscoverGameNotificationsEnabled(),
        getDiscoverGameNotificationsPrompted(),
    ]);

    if (enabled || prompted) {
        promptInFlight = false;
        return;
    }

    const handleDismiss = () => {
        void setDiscoverGameNotificationsPrompted(true);
        promptInFlight = false;
    };

    const handleEnable = () => {
        void (async () => {
            try {
                const granted = await ensureNotificationPermissions();
                if (!granted) {
                    Alert.alert(
                        'Notifications are off',
                        'Enable notifications in Settings to get new event reminders.'
                    );
                    await setDiscoverGameNotificationsPrompted(true);
                    return;
                }

                await setDiscoverGameNotificationsEnabled(true);
                await setDiscoverGameNotificationsPrompted(true);
                await scheduleDiscoverGameNotifications({ availableCardsToSwipe });
            } catch (error) {
                console.warn('[discover-game] failed to enable notifications', error);
            } finally {
                promptInFlight = false;
            }
        })();
    };

    Alert.alert(
        'Would you like to enable notifications for new events?',
        undefined,
        [
            { text: 'Not now', style: 'cancel', onPress: handleDismiss },
            { text: 'Enable', onPress: handleEnable },
        ],
        { cancelable: true, onDismiss: handleDismiss }
    );
};

export const scheduleDiscoverGameNotifications = async ({
    availableCardsToSwipe,
}: {
    availableCardsToSwipe: Event[];
}) => {
    const [enabled, lastSwipeRaw] = await Promise.all([
        getDiscoverGameNotificationsEnabled(),
        AsyncStorage.getItem(DISCOVER_GAME_LAST_SWIPE_AT_KEY),
    ]);

    if (!enabled) {
        await cancelDiscoverGameNotifications();
        return;
    }

    const lastSwipeAt = parseStoredNumber(lastSwipeRaw);
    if (!lastSwipeAt) {
        await cancelDiscoverGameNotifications();
        return;
    }

    const now = Date.now();

    const permissions = await Notifications.getPermissionsAsync();
    if (!isPermissionGranted(permissions)) {
        await cancelDiscoverGameNotifications();
        return;
    }

    const eventsWithTimestamps = availableCardsToSwipe as EventWithTimestamps[];
    const newEventCount = eventsWithTimestamps.reduce((count, event) => {
        const createdAt = getEventCreatedAt(event);
        if (!createdAt) return count;
        return createdAt > lastSwipeAt ? count + 1 : count;
    }, 0);

    await Notifications.setBadgeCountAsync(newEventCount).catch(() => undefined);

    await cancelDiscoverGameNotifications();

    const channelId = await ensureDiscoverGameNotificationChannel();
    const newEventsContent: Notifications.NotificationContentInput = {
        title: 'Discover Game',
        body: `${newEventCount} new events since you last swiped!`,
        badge: newEventCount,
        data: {
            source: 'discover_game',
            newEventCount,
        },
    };
    const reminderContent: Notifications.NotificationContentInput = {
        title: 'Discover Game',
        body: 'Play a quick swipe game to plan your week',
        badge: newEventCount,
        data: {
            source: 'discover_game',
            newEventCount,
        },
    };

    const scheduledIds: string[] = [];
    const sendTimes =
        now - lastSwipeAt < INACTIVITY_MS
            ? buildUpcomingNotificationTimes(lastSwipeAt, now)
            : [];
    const reminderTimes = buildMonthlyReminderTimes(lastSwipeAt, now);

    for (const sendAt of sendTimes) {
        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: newEventsContent,
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: sendAt,
                    ...(channelId ? { channelId } : {}),
                },
            });
            scheduledIds.push(id);
        } catch (error) {
            console.warn('[discover-game] failed to schedule notification', error);
        }
    }

    for (const sendAt of reminderTimes) {
        if (sendAt <= now) continue;
        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: reminderContent,
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: sendAt,
                    ...(channelId ? { channelId } : {}),
                },
            });
            scheduledIds.push(id);
        } catch (error) {
            console.warn('[discover-game] failed to schedule reminder notification', error);
        }
    }

    if (!scheduledIds.length) return;

    await AsyncStorage.setItem(DISCOVER_GAME_NOTIFICATION_IDS_KEY, JSON.stringify(scheduledIds));
};

export const resetDiscoverGameNotifications = async () => {
    await cancelDiscoverGameNotifications();
    await AsyncStorage.multiRemove([
        DISCOVER_GAME_NOTIFICATIONS_ENABLED_KEY,
        DISCOVER_GAME_NOTIFICATIONS_PROMPTED_KEY,
        DISCOVER_GAME_SWIPE_COUNT_KEY,
        DISCOVER_GAME_LAST_SWIPE_AT_KEY,
    ]);
    await Notifications.setBadgeCountAsync(0).catch(() => undefined);
};
