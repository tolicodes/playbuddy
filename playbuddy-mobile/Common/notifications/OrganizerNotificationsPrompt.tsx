import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';

import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { useCalendarData } from '../../Pages/Calendar/hooks/useCalendarData';
import { useFetchFollows } from '../db-axios/useFollows';
import { useCommonContext } from '../hooks/CommonContext';
import {
    ensureNotificationPermissions,
    getPushNotificationsEnabled,
    getPushNotificationsPrompted,
    registerRemotePushToken,
    scheduleOrganizerNotifications,
    setPushNotificationsEnabled,
    setPushNotificationsPrompted,
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

            const [enabled, prompted] = await Promise.all([
                getPushNotificationsEnabled(),
                getPushNotificationsPrompted(),
            ]);

            if (enabled || prompted) {
                promptInFlightRef.current = false;
                return;
            }

            const handleDismiss = () => {
                void setPushNotificationsPrompted(true);
                promptInFlightRef.current = false;
            };

            const handleEnable = () => {
                void (async () => {
                    const granted = await ensureNotificationPermissions();
                    if (!granted) {
                        Alert.alert(
                            'Notifications are off',
                            'Enable notifications in Settings to get workshop reminders.'
                        );
                        await setPushNotificationsPrompted(true);
                        promptInFlightRef.current = false;
                        return;
                    }

                    await setPushNotificationsEnabled(true);
                    await setPushNotificationsPrompted(true);

                    try {
                        await registerRemotePushToken();
                    } catch (error) {
                        console.warn('[notifications] failed to register push token', error);
                    }

                    await scheduleOrganizerNotifications({
                        events: allEvents,
                        followedOrganizerIds,
                    });

                    promptInFlightRef.current = false;
                })();
            };

            Alert.alert(
                'Turn on notifications?',
                'Get workshop reminders from organizers you follow.',
                [
                    { text: 'Not now', style: 'cancel', onPress: handleDismiss },
                    { text: 'Enable', onPress: handleEnable },
                ],
                { cancelable: true, onDismiss: handleDismiss }
            );
        })();
    }, [allEvents, followedOrganizerIds]);

    useEffect(() => {
        if (!authUserId) return;
        if (isLoadingCommunities) return;

        if (lastOrganizerCountRef.current === null) {
            lastOrganizerCountRef.current = organizerCount;
            if (organizerCount > 0) {
                promptForNotifications();
            }
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
