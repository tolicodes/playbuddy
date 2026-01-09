import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { useFetchFollows } from '../../Common/db-axios/useFollows';
import { ADMIN_EMAILS } from '../../config';
import {
    cancelOrganizerNotifications,
    ensureNotificationChannel,
    ensureNotificationPermissions,
    getOrganizerNotificationCandidate,
    getOrganizerNotificationEligibilityInfo,
    getOrganizerNotificationSchedule,
    getPushNotificationsEnabled,
    scheduleOrganizerNotifications,
    setPushNotificationsEnabled,
    setPushNotificationsPrompted,
} from '../../Common/notifications/organizerPushNotifications';

type AccordionSectionProps = {
    title: string;
    subtitle?: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
};

const AccordionSection = ({ title, subtitle, expanded, onToggle, children }: AccordionSectionProps) => (
    <View style={styles.accordionCard}>
        <Pressable style={styles.accordionHeader} onPress={onToggle}>
            <View style={styles.accordionHeaderCopy}>
                <Text style={styles.accordionTitle}>{title}</Text>
                {subtitle ? <Text style={styles.accordionSubtitle}>{subtitle}</Text> : null}
            </View>
            <FAIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </Pressable>
        {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
);

export const DebugScreen = () => {
    const { authUserId, userProfile } = useUserContext();
    const { allEvents } = useCalendarContext();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const [notificationExpanded, setNotificationExpanded] = useState(true);
    const [debugStatus, setDebugStatus] = useState<string | null>(null);
    const [notificationDebugLines, setNotificationDebugLines] = useState<string[]>([]);
    const [scheduledNotifications, setScheduledNotifications] = useState<
        {
            id: string;
            title: string;
            body: string;
            sendAt: number;
        }[]
    >([]);
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const canAccess = __DEV__ || isAdmin;

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

    const refreshNotificationDebugInfo = useCallback(
        async (context?: string) => {
            if (!canAccess) return;
            const lines: string[] = [];
            if (context) {
                lines.push(`Context: ${context}`);
            }

            let permissions: Notifications.NotificationPermissionsStatus | null = null;
            try {
                permissions = await Notifications.getPermissionsAsync();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                lines.push(`Permissions: error ${message}`);
            }

            let pushEnabledFlag: boolean | null = null;
            try {
                pushEnabledFlag = await getPushNotificationsEnabled();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                lines.push(`Push flag: error ${message}`);
            }

            const eligibility = getOrganizerNotificationEligibilityInfo({
                events: allEvents,
                followedOrganizerIds,
            });
            const nextWeekEligibility = getOrganizerNotificationEligibilityInfo({
                events: allEvents,
                followedOrganizerIds,
                windowStartDays: 0,
                windowEndDays: 7,
            });

            let scheduledCount: number | null = null;
            try {
                const schedule = await getOrganizerNotificationSchedule();
                scheduledCount = schedule.length;
                const summaries = schedule.map((item) => ({
                    id: `${item.sendAt}-${item.title}`,
                    title: item.title,
                    body: item.body,
                    sendAt: item.sendAt,
                }));
                setScheduledNotifications(summaries.slice(0, 5));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                lines.push(`Scheduled notifications: error ${message}`);
                setScheduledNotifications([]);
            }

            lines.push(`Platform: ${Platform.OS}`);
            if (pushEnabledFlag !== null) {
                lines.push(`Push enabled flag: ${pushEnabledFlag}`);
            }
            if (permissions) {
                lines.push(`Permissions: granted=${permissions.granted} status=${permissions.status}`);
                if (permissions.ios) {
                    lines.push(`iOS status: ${permissions.ios.status}`);
                }
            }
            lines.push(`Followed organizers: ${followedOrganizerIds.size}`);
            lines.push(
                `Eligible events: ${eligibility.eligibleCount} (window ${eligibility.windowStart} - ${eligibility.windowEnd})`
            );
            lines.push(
                `Next week events: ${nextWeekEligibility.eligibleCount} (window ${nextWeekEligibility.windowStart} - ${nextWeekEligibility.windowEnd})`
            );
            if (eligibility.candidateEvent) {
                lines.push(
                    `Candidate: ${eligibility.candidateEvent.organizer?.name || 'Organizer'} - ${eligibility.candidateEvent.name}`
                );
                if (eligibility.candidateStart) {
                    lines.push(`Candidate start: ${eligibility.candidateStart}`);
                }
            } else {
                lines.push('Candidate: none');
            }
            if (scheduledCount !== null) {
                lines.push(`Scheduled notifications: ${scheduledCount}`);
            }

            setNotificationDebugLines(lines);
        },
        [allEvents, canAccess, followedOrganizerIds]
    );

    useEffect(() => {
        if (!canAccess) return;
        void refreshNotificationDebugInfo('focus');
    }, [canAccess, refreshNotificationDebugInfo]);

    const onPressTestNotification = () => {
        void (async () => {
            const candidate = getOrganizerNotificationCandidate({
                events: allEvents,
                followedOrganizerIds,
            });
            if (!candidate) {
                setDebugStatus('No eligible organizer events in the next 4 weeks.');
                Alert.alert(
                    'No eligible events',
                    'Follow an organizer with events in the next 4 weeks to test reminders.'
                );
                await refreshNotificationDebugInfo('test notification: no candidate');
                return;
            }

            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Enable notifications in Settings to test reminders.'
                );
                await refreshNotificationDebugInfo('test notification: permissions off');
                return;
            }
            try {
                const channelId = await ensureNotificationChannel();
                const sendAt = Date.now() + 5000;
                const baseContent = channelId
                    ? { ...candidate.content, channelId }
                    : candidate.content;
                const content = {
                    ...baseContent,
                    data: {
                        ...(baseContent.data || {}),
                        source: 'test',
                        sendAt,
                    },
                };
                await Notifications.scheduleNotificationAsync({
                    content,
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        seconds: 5,
                        repeats: false,
                    },
                });
                setDebugStatus(
                    `Test notification scheduled for ${candidate.event.organizer?.name || 'Organizer'} - ${candidate.event.name}.`
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                setDebugStatus(`Test notification failed to schedule: ${message}`);
            }
            await refreshNotificationDebugInfo('test notification');
        })();
    };

    const onPressScheduleOrganizerReminder = () => {
        void (async () => {
            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Enable notifications in Settings to test reminders.'
                );
                await refreshNotificationDebugInfo('schedule reminder: permissions off');
                return;
            }

            await setPushNotificationsEnabled(true);
            await setPushNotificationsPrompted(true);

            const scheduled = await scheduleOrganizerNotifications({
                events: allEvents,
                followedOrganizerIds,
            });

            if (!scheduled.length) {
                setDebugStatus('No eligible organizer events for the next 20 days.');
                Alert.alert(
                    'No eligible events',
                    'Follow an organizer with events 5-10 days out to test reminders.'
                );
                await refreshNotificationDebugInfo('schedule reminder');
                return;
            }

            const scheduledWithEvents = scheduled.filter((item) => !!item.eventId);
            if (scheduledWithEvents.length) {
                setDebugStatus(`Scheduled ${scheduledWithEvents.length} notifications.`);
            } else {
                setDebugStatus('Scheduled notifications without eligible events.');
            }
            await refreshNotificationDebugInfo('schedule reminder');
        })();
    };

    const onPressClearOrganizerReminders = () => {
        void (async () => {
            await cancelOrganizerNotifications();
            setDebugStatus('Cleared scheduled organizer reminders.');
            await refreshNotificationDebugInfo('clear reminders');
        })();
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[colors.brandIndigo, colors.accentPurple]} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Debug</Text>
                        <Text style={styles.sectionSubtitle}>
                            Use these tools to verify notifications and app behavior.
                        </Text>
                    </View>

                    {!canAccess && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.infoText}>Debug tools are only available in dev builds.</Text>
                        </View>
                    )}

                    {canAccess && (
                        <AccordionSection
                            title="Notifications"
                            subtitle="Reminders, permissions, and scheduled jobs"
                            expanded={notificationExpanded}
                            onToggle={() => setNotificationExpanded((prev) => !prev)}
                        >
                            <TouchableOpacity style={styles.secondaryButton} onPress={onPressTestNotification}>
                                <Text style={styles.secondaryButtonText}>Send test notification</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton} onPress={onPressScheduleOrganizerReminder}>
                                <Text style={styles.secondaryButtonText}>Schedule organizer reminder</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton} onPress={onPressClearOrganizerReminders}>
                                <Text style={styles.secondaryButtonText}>Clear organizer reminders</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => void refreshNotificationDebugInfo('manual refresh')}
                            >
                                <Text style={styles.secondaryButtonText}>Refresh notification debug</Text>
                            </TouchableOpacity>
                            {!!debugStatus && <Text style={styles.debugMeta}>{debugStatus}</Text>}
                            {notificationDebugLines.map((line, index) => (
                                <Text key={`${line}-${index}`} style={styles.debugMeta}>
                                    {line}
                                </Text>
                            ))}
                            <View style={styles.scheduledList}>
                                <Text style={styles.scheduledHeader}>Queued notifications</Text>
                                {scheduledNotifications.length === 0 ? (
                                    <Text style={styles.debugMeta}>No scheduled notifications.</Text>
                                ) : (
                                    scheduledNotifications.map((notification) => (
                                        <View key={notification.id} style={styles.scheduledItem}>
                                            <Text style={styles.debugMeta}>
                                                {formatScheduledDate(notification.sendAt)}
                                            </Text>
                                            <Text style={styles.debugMeta}>
                                                {formatScheduledMessage(notification.title, notification.body)}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </AccordionSection>
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
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.card,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.brandPurple,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    sectionSubtitle: {
        fontSize: fontSizes.base,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    infoText: {
        fontSize: fontSizes.base,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    accordionCard: {
        backgroundColor: colors.white,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        marginBottom: spacing.lg,
        ...shadows.card,
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lgPlus,
        paddingVertical: spacing.mdPlus,
    },
    accordionHeaderCopy: {
        flex: 1,
        paddingRight: spacing.md,
    },
    accordionTitle: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    accordionSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    accordionBody: {
        paddingHorizontal: spacing.lgPlus,
        paddingBottom: spacing.lgPlus,
        gap: spacing.sm,
    },
    secondaryButton: {
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    secondaryButtonText: {
        color: colors.brandIndigo,
        fontSize: fontSizes.sm,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
        textAlign: 'center',
    },
    scheduledList: {
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    scheduledHeader: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    scheduledItem: {
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLavenderSoft,
    },
    debugMeta: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
});

const formatScheduledDate = (timestamp: number) => {
    if (!timestamp) return 'Send: unknown';
    return `Send: ${new Date(timestamp).toLocaleString()}`;
};

const formatScheduledMessage = (title: string, body: string) => {
    if (body) {
        return `Message: ${title} — ${body}`;
    }
    return `Message: ${title}`;
};

export default DebugScreen;
