import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { useCalendarData } from '../../Pages/Calendar/hooks/useCalendarData';
import { useFetchFollows } from '../db-axios/useFollows';
import {
    promptOrganizerNotificationsIfNeeded,
} from './organizerPushNotifications';

export const OrganizerNotificationsPrompt = () => {
    const { authUserId } = useUserContext();
    const { allEvents } = useCalendarData();
    const { data: follows, isFetched: isFollowsFetched } = useFetchFollows(authUserId || undefined);
    const lastOrganizerCountRef = useRef<number | null>(null);
    const promptInFlightRef = useRef(false);

    useEffect(() => {
        lastOrganizerCountRef.current = null;
        promptInFlightRef.current = false;
    }, [authUserId]);

    const organizerCount = useMemo(() => {
        return new Set((follows?.organizer || []).map((id) => id.toString())).size;
    }, [follows?.organizer]);

    const followedOrganizerIds = useMemo(() => {
        const followIds = (follows?.organizer || []).map((id) => id.toString());
        return new Set(followIds);
    }, [follows?.organizer]);

    const promptForNotifications = useCallback(() => {
        void (async () => {
            if (promptInFlightRef.current) return;
            promptInFlightRef.current = true;

            try {
                await promptOrganizerNotificationsIfNeeded({
                    events: allEvents,
                    followedOrganizerIds,
                });
            } finally {
                promptInFlightRef.current = false;
            }
        })();
    }, [allEvents, followedOrganizerIds]);

    useEffect(() => {
        if (!authUserId) return;
        if (!isFollowsFetched) return;

        if (lastOrganizerCountRef.current === null) {
            lastOrganizerCountRef.current = organizerCount;
            return;
        }

        const previousCount = lastOrganizerCountRef.current;
        lastOrganizerCountRef.current = organizerCount;

        if (previousCount === 0 && organizerCount > 0) {
            promptForNotifications();
        }
    }, [authUserId, isFollowsFetched, organizerCount, promptForNotifications]);

    return null;
};
