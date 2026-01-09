import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment-timezone';

import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { useFetchFollows } from '../../Common/db-axios/useFollows';
import { navigateToHomeStackScreen, navigateToTab } from '../../Common/Nav/navigationHelpers';
import type { NavStack } from '../../Common/Nav/NavStackType';
import {
    ensureNotificationPermissions,
    getPushNotificationsEnabled,
    registerRemotePushToken,
    scheduleOrganizerNotifications,
    setPushNotificationsEnabled,
    setPushNotificationsPrompted,
} from '../../Common/notifications/organizerPushNotifications';
import {
    getNotificationHistory,
    NotificationHistoryItem,
    subscribeToNotificationHistory,
    setNotificationHistorySeenAt,
} from '../../Common/notifications/notificationHistory';

export const NotificationsScreen = () => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const { authUserId } = useUserContext();
    const { allEvents } = useCalendarContext();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

    const hasFollowedOrganizers = followedOrganizerIds.size > 0;
    const eventsById = useMemo(() => {
        return new Map(allEvents.map((event) => [event.id, event]));
    }, [allEvents]);

    const refreshHistory = useCallback(async () => {
        const list = await getNotificationHistory();
        const now = Date.now();
        setHistory(list.filter((item) => item.createdAt <= now));
    }, []);

    useEffect(() => {
        let isActive = true;
        if (!isFocused) {
            return () => {
                isActive = false;
            };
        }

        const load = async () => {
            const now = Date.now();
            await setNotificationHistorySeenAt(now);
            const [list, enabled] = await Promise.all([
                getNotificationHistory(),
                getPushNotificationsEnabled(),
            ]);
            if (!isActive) return;
            setHistory(list.filter((item) => item.createdAt <= now));
            setNotificationsEnabled(enabled);
        };

        void load();
        return () => {
            isActive = false;
        };
    }, [isFocused]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            void refreshHistory();
        });
        return unsubscribe;
    }, [navigation, refreshHistory]);

    useEffect(() => {
        const unsubscribe = subscribeToNotificationHistory(() => {
            void refreshHistory();
        });

        return () => {
            unsubscribe();
        };
    }, [refreshHistory]);

    const onEnableNotifications = () => {
        void (async () => {
            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Enable notifications in Settings to get workshop reminders.'
                );
                return;
            }

            await setPushNotificationsEnabled(true);
            await setPushNotificationsPrompted(true);
            setNotificationsEnabled(true);

            try {
                await registerRemotePushToken();
            } catch (error) {
                console.warn('[notifications] failed to register push token', error);
            }

            await scheduleOrganizerNotifications({
                events: allEvents,
                followedOrganizerIds,
            });

            await refreshHistory();
        })();
    };

    const onFollowOrganizers = () => {
        navigateToTab(navigation, 'Organizers');
    };

    const onPressNotification = useCallback(
        async (item: NotificationHistoryItem) => {
            const rawEventId = item.eventId;
            const eventId = typeof rawEventId === 'number' ? rawEventId : Number(rawEventId);
            if (!eventId || Number.isNaN(eventId)) return;
            const event = eventsById.get(eventId);
            if (!event) {
                Alert.alert('Event not found', 'This event is no longer available.');
                return;
            }
            await setNotificationHistorySeenAt(Date.now());
            navigateToHomeStackScreen(navigation, 'Event Details', {
                selectedEvent: event,
                title: event.name,
            });
        },
        [eventsById, navigation]
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[colors.brandIndigo, colors.accentPurple]} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {history.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No notifications yet</Text>
                            {!notificationsEnabled && (
                                <Text style={styles.emptyBody}>
                                    To receive new events from your favorite organizers:
                                </Text>
                            )}

                            {!notificationsEnabled && (
                                <View style={styles.stepCard}>
                                    <Text style={styles.stepTitle}>1. Enable notifications</Text>
                                    <Text style={styles.stepBody}>
                                        We will send a curated workshop pick every few days.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.stepButton}
                                        onPress={onEnableNotifications}
                                    >
                                        <Text style={styles.stepButtonText}>Enable notifications</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!hasFollowedOrganizers && (
                                <View style={styles.stepCard}>
                                    <Text style={styles.stepTitle}>2. Follow organizers</Text>
                                    <Text style={styles.stepBody}>
                                        Follow a few organizers to personalize your reminders.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.stepButton}
                                        onPress={onFollowOrganizers}
                                    >
                                        <Text style={styles.stepButtonText}>Follow organizers</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Recent notifications</Text>
                            {history.map((item) => {
                                const rawEventId = item.eventId;
                                const eventId = typeof rawEventId === 'number' ? rawEventId : Number(rawEventId);
                                const event = Number.isNaN(eventId) ? null : eventsById.get(eventId);
                                const imageUrl = item.imageUrl || event?.image_url || '';
                                const isInteractive = !!event;
                                return (
                                    <Pressable
                                        key={item.id}
                                        style={({ pressed }) => [
                                            styles.notificationCard,
                                            pressed && isInteractive && styles.notificationCardPressed,
                                        ]}
                                        onPress={() => void onPressNotification(item)}
                                        disabled={!isInteractive}
                                    >
                                        {imageUrl ? (
                                            <Image
                                                source={{ uri: imageUrl }}
                                                style={styles.notificationImage}
                                                contentFit="cover"
                                                cachePolicy="disk"
                                            />
                                        ) : null}
                                        <View style={styles.notificationContent}>
                                            <View style={styles.notificationHeader}>
                                                <Text style={styles.notificationTitle}>{item.title}</Text>
                                                <Text style={styles.notificationTime}>
                                                    {moment(item.createdAt).fromNow()}
                                                </Text>
                                            </View>
                                            <Text style={styles.notificationBody}>{item.body}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.brandIndigo,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.jumbo,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: radius.xl,
        padding: spacing.lgPlus,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.card,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.brandPurple,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: fontFamilies.body,
    },
    emptyCard: {
        backgroundColor: colors.white,
        borderRadius: radius.xl,
        padding: spacing.lgPlus,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.card,
    },
    emptyTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    emptyBody: {
        fontSize: fontSizes.base,
        color: colors.brandTextMuted,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    stepCard: {
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.mdPlus,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        marginBottom: spacing.md,
    },
    stepTitle: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.brandPurpleDark,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    stepBody: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        marginBottom: spacing.smPlus,
        fontFamily: fontFamilies.body,
    },
    stepButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        alignSelf: 'flex-start',
    },
    stepButtonDisabled: {
        backgroundColor: colors.borderMutedAlt,
    },
    stepButtonText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLavenderSoft,
    },
    notificationCardPressed: {
        backgroundColor: colors.surfaceLavenderLight,
    },
    notificationImage: {
        width: 56,
        height: 56,
        borderRadius: radius.mdPlus,
        backgroundColor: colors.surfaceMutedAlt,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.xs,
    },
    notificationTitle: {
        flex: 1,
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    notificationTime: {
        fontSize: fontSizes.xs,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    notificationBody: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
});
