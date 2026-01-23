import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import type { Event } from '../../commonTypes';
import { useCalendarData } from '../../Pages/Calendar/hooks/useCalendarData';
import { navigateToTab } from '../Nav/navigationHelpers';
import { navigationRef } from '../Nav/navigationRef';
import { setNotificationHistorySeenAt, upsertNotificationHistoryItem } from './notificationHistory';

type NotificationData = {
    eventId?: number | string;
    source?: string;
    imageUrl?: string;
    image_url?: string;
    sendAt?: number;
};

const ALLOWED_SOURCES = new Set(['test', 'badge', 'organizer', 'broadcast', 'admin_review', 'discover_game']);

const MAX_NAVIGATION_ATTEMPTS = 5;
const NAVIGATION_RETRY_DELAY_MS = 300;

const navigateToDiscoverGame = (attempts = MAX_NAVIGATION_ATTEMPTS) => {
    if (navigationRef.isReady()) {
        navigateToTab(navigationRef as any, 'More', { screen: 'Discover Game' });
        return;
    }

    if (attempts <= 0) return;
    setTimeout(() => navigateToDiscoverGame(attempts - 1), NAVIGATION_RETRY_DELAY_MS);
};

const navigateToEventDetails = (event: Event, attempts = MAX_NAVIGATION_ATTEMPTS) => {
    if (navigationRef.isReady()) {
        navigationRef.navigate('HomeDrawer', {
            screen: 'Event Details',
            params: {
                selectedEvent: event,
                title: event.name,
            },
        });
        return;
    }

    if (attempts <= 0) return;
    setTimeout(() => navigateToEventDetails(event, attempts - 1), NAVIGATION_RETRY_DELAY_MS);
};

export const NotificationResponseHandler = () => {
    const { allEvents } = useCalendarData();
    const handledResponseIds = useRef(new Set<string>());
    const recordedNotificationIds = useRef(new Set<string>());
    const pendingEventId = useRef<number | null>(null);

    const recordNotification = useCallback(
        async (notification: Notifications.Notification) => {
            const identifier = notification.request.identifier;
            if (recordedNotificationIds.current.has(identifier)) return;
            recordedNotificationIds.current.add(identifier);

            const content = notification.request.content;
            const data = content.data as NotificationData | undefined;
            const notificationDate =
                notification.date instanceof Date
                    ? notification.date.getTime()
                    : notification.date;
            const createdAt =
                typeof data?.sendAt === 'number' && Number.isFinite(data.sendAt)
                    ? data.sendAt
                    : typeof notificationDate === 'number' && Number.isFinite(notificationDate)
                    ? notificationDate
                    : Date.now();

            const source = typeof data?.source === 'string' && ALLOWED_SOURCES.has(data.source)
                ? data.source
                : 'organizer';

            const rawEventId = data?.eventId;
            const eventId = typeof rawEventId === 'number' ? rawEventId : Number(rawEventId);
            const hasEventId = !!eventId && !Number.isNaN(eventId);
            if (!hasEventId && source !== 'broadcast' && source !== 'admin_review' && source !== 'discover_game') return;

            await upsertNotificationHistoryItem({
                title: content.title || 'Notification',
                body: content.body || '',
                createdAt,
                source,
                eventId: hasEventId ? eventId : undefined,
                imageUrl:
                    typeof data?.imageUrl === 'string'
                        ? data.imageUrl
                        : typeof data?.image_url === 'string'
                        ? data.image_url
                        : undefined,
            });
        },
        [upsertNotificationHistoryItem]
    );

    const handleResponse = useCallback(
        (response?: Notifications.NotificationResponse | null) => {
            if (!response) return;
            const identifier = response.notification.request.identifier;
            if (handledResponseIds.current.has(identifier)) return;

            handledResponseIds.current.add(identifier);
            void recordNotification(response.notification);
            void setNotificationHistorySeenAt(Date.now());

            const data = response.notification.request.content.data as NotificationData | undefined;
            const rawEventId = data?.eventId;
            const source = typeof data?.source === 'string' && ALLOWED_SOURCES.has(data.source)
                ? data.source
                : null;
            if (source === 'discover_game') {
                navigateToDiscoverGame();
                return;
            }
            const eventId = typeof rawEventId === 'number' ? rawEventId : Number(rawEventId);
            if (!eventId || Number.isNaN(eventId)) return;

            const event = allEvents.find((item) => item.id === eventId);
            if (!event) {
                pendingEventId.current = eventId;
                return;
            }

            navigateToEventDetails(event);
        },
        [allEvents, recordNotification]
    );

    useEffect(() => {
        if (!pendingEventId.current) return;
        const event = allEvents.find((item) => item.id === pendingEventId.current);
        if (!event) return;
        pendingEventId.current = null;
        navigateToEventDetails(event);
    }, [allEvents]);

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
        void Notifications.getLastNotificationResponseAsync().then(handleResponse);
        return () => {
            subscription.remove();
        };
    }, [handleResponse]);

    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener((notification) => {
            void recordNotification(notification);
        });
        return () => {
            subscription.remove();
        };
    }, [recordNotification]);

    return null;
};
