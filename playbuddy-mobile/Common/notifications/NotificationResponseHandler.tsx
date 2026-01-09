import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import type { Event } from '../../commonTypes';
import { useCalendarContext } from '../../Pages/Calendar/hooks/CalendarContext';
import { navigationRef } from '../Nav/navigationRef';
import { setNotificationHistorySeenAt, upsertNotificationHistoryItem } from './notificationHistory';

type NotificationData = {
    eventId?: number | string;
    source?: string;
    imageUrl?: string;
    image_url?: string;
    sendAt?: number;
};

const MAX_NAVIGATION_ATTEMPTS = 5;
const NAVIGATION_RETRY_DELAY_MS = 300;

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
    const { allEvents } = useCalendarContext();
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

            const source =
                data?.source === 'test' ||
                data?.source === 'badge' ||
                data?.source === 'organizer' ||
                data?.source === 'broadcast'
                    ? data.source
                    : 'organizer';

            const rawEventId = data?.eventId;
            const eventId = typeof rawEventId === 'number' ? rawEventId : Number(rawEventId);
            if (source !== 'broadcast' && (!eventId || Number.isNaN(eventId))) return;

            await upsertNotificationHistoryItem({
                title: content.title || 'Notification',
                body: content.body || '',
                createdAt,
                source,
                eventId: source === 'broadcast' ? undefined : eventId,
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
