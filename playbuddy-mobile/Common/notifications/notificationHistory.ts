import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationHistoryItem = {
    id: string;
    title: string;
    body: string;
    createdAt: number;
    source?: 'organizer' | 'test' | 'badge' | 'broadcast';
    eventId?: number;
    imageUrl?: string;
};

const NOTIFICATION_HISTORY_KEY = 'notificationHistory';
const NOTIFICATION_HISTORY_SEEN_KEY = 'notificationHistorySeenAt';
const MAX_HISTORY_ITEMS = 50;
const historyListeners = new Set<() => void>();

export const buildNotificationHistoryId = (
    source: NotificationHistoryItem['source'],
    createdAt: number
) => {
    const prefix = source || 'notification';
    return `${prefix}-${createdAt}-${Math.random().toString(16).slice(2)}`;
};

const parseHistory = (raw: string | null): NotificationHistoryItem[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getNotificationHistory = async () => {
    const raw = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history = parseHistory(raw);
    return history.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_HISTORY_ITEMS);
};

export const setNotificationHistory = async (history: NotificationHistoryItem[]) => {
    const next = [...history]
        .filter((item) => item && Number.isFinite(item.createdAt))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(next));
    historyListeners.forEach((listener) => listener());
    return next;
};

export const addNotificationHistoryItem = async (
    item: Omit<NotificationHistoryItem, 'id'>
) => {
    const history = await getNotificationHistory();
    const id = buildNotificationHistoryId(item.source, item.createdAt);
    const next = [{ id, ...item }, ...history];
    await setNotificationHistory(next);
    return { id, ...item };
};

export const upsertNotificationHistoryItem = async (
    item: Omit<NotificationHistoryItem, 'id'>
) => {
    const history = await getNotificationHistory();
    const matchIndex =
        item.eventId !== undefined
            ? history.findIndex(
                  (entry) => entry.eventId === item.eventId && entry.source === item.source
              )
            : -1;
    if (matchIndex >= 0) {
        const next = [...history];
        next[matchIndex] = { ...next[matchIndex], ...item };
        await setNotificationHistory(next);
        return next[matchIndex];
    }
    return addNotificationHistoryItem(item);
};

export const getNotificationHistorySeenAt = async () => {
    const raw = await AsyncStorage.getItem(NOTIFICATION_HISTORY_SEEN_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
};

export const setNotificationHistorySeenAt = async (timestamp: number) => {
    await AsyncStorage.setItem(NOTIFICATION_HISTORY_SEEN_KEY, String(timestamp));
};

export const getUnreadNotificationCount = async () => {
    const [history, seenAt] = await Promise.all([
        getNotificationHistory(),
        getNotificationHistorySeenAt(),
    ]);

    if (!history.length) return 0;
    const now = Date.now();
    return history.filter((item) => item.createdAt <= now && item.createdAt > seenAt).length;
};

export const subscribeToNotificationHistory = (listener: () => void) => {
    historyListeners.add(listener);
    return () => {
        historyListeners.delete(listener);
    };
};
