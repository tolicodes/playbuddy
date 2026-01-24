import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { useCalendarData } from '../../Pages/Calendar/hooks/useCalendarData';
import { useFetchFollows } from '../db-axios/useFollows';
import { useCommonContext } from '../hooks/CommonContext';
import {
    promptOrganizerNotificationsIfNeeded,
} from './organizerPushNotifications';

export const OrganizerNotificationsPrompt = () => {
    const { authUserId } = useUserContext();
    const { allEvents } = useCalendarData();
    const { myCommunities, isLoadingCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const lastOrganizerCountRef = useRef<number | null>(null);
    const promptInFlightRef = useRef(false);

    useEffect(() => {
        lastOrganizerCountRef.current = null;
        promptInFlightRef.current = false;
    }, [authUserId]);

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

    const organizerCount = useMemo(() => {
        return new Set(organizerIdsFromCommunities).size;
    }, [organizerIdsFromCommunities]);

    const followedOrganizerIds = useMemo(() => {
        const followIds = (follows?.organizer || []).map((id) => id.toString());
        return new Set([...followIds, ...organizerIdsFromCommunities]);
    }, [follows?.organizer, organizerIdsFromCommunities]);

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
        if (isLoadingCommunities) return;

        if (lastOrganizerCountRef.current === null) {
            lastOrganizerCountRef.current = organizerCount;
            return;
        }

        const previousCount = lastOrganizerCountRef.current;
        lastOrganizerCountRef.current = organizerCount;

        if (previousCount === 0 && organizerCount > 0) {
            promptForNotifications();
        }
    }, [authUserId, isLoadingCommunities, organizerCount, promptForNotifications]);

    return null;
};
