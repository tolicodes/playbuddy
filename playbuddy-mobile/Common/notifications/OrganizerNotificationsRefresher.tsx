import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { useCalendarData } from '../../Pages/Calendar/hooks/useCalendarData';
import { useCommonContext } from '../hooks/CommonContext';
import { useFetchFollows } from '../db-axios/useFollows';
import {
    getPushNotificationsEnabled,
    scheduleOrganizerNotifications,
} from './organizerPushNotifications';

const REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

export const OrganizerNotificationsRefresher = () => {
    const { authUserId } = useUserContext();
    const { allEvents } = useCalendarData();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const lastRefreshAt = useRef(0);

    const organizerIdsFromCommunities = useMemo(() => {
        const organizerCommunities = [
            ...myCommunities.myOrganizerPublicCommunities,
            ...myCommunities.myOrganizerPrivateCommunities,
        ];
        return organizerCommunities
            .map((community) => community.organizer_id)
            .filter(Boolean)
            .map((id) => id.toString());
    }, [myCommunities.myOrganizerPrivateCommunities, myCommunities.myOrganizerPublicCommunities]);

    const followedOrganizerIds = useMemo(() => {
        const followIds = (follows?.organizer || []).map((id) => id.toString());
        return new Set([...followIds, ...organizerIdsFromCommunities]);
    }, [follows?.organizer, organizerIdsFromCommunities]);

    const refreshNotifications = useCallback(
        async (reason: string) => {
            if (!authUserId) return;
            if (!allEvents.length) return;
            const enabled = await getPushNotificationsEnabled();
            if (!enabled) return;

            const now = Date.now();
            if (now - lastRefreshAt.current < REFRESH_COOLDOWN_MS) {
                return;
            }
            lastRefreshAt.current = now;

            if (__DEV__) {
                console.log('[notifications] refresh organizer notifications', {
                    reason,
                    followedOrganizerCount: followedOrganizerIds.size,
                    eventsCount: allEvents.length,
                });
            }

            await scheduleOrganizerNotifications({
                events: allEvents,
                followedOrganizerIds,
            });
        },
        [allEvents, authUserId, followedOrganizerIds]
    );

    useEffect(() => {
        void refreshNotifications('initial');
    }, [refreshNotifications]);

    useEffect(() => {
        let subscription: { remove: () => void } | undefined;
        try {
            subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
                if (nextState === 'active') {
                    void refreshNotifications('app-active');
                }
            });
        } catch {
            return;
        }

        return () => {
            subscription?.remove();
        };
    }, [refreshNotifications]);

    return null;
};
