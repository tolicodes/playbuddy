import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { useFetchFollows } from '../../Common/db-axios/useFollows';
import { useFetchActiveEventPopups, useFetchEventPopups } from '../../Common/db-axios/useEventPopups';
import { navigateToTab } from '../../Common/Nav/navigationHelpers';
import type { NavStack } from '../../Common/Nav/NavStackType';
import type { EventPopup } from '../../Common/types/commonTypes';
import { ADMIN_EMAILS } from '../../config';
import {
    getForcedPopupId,
    getLatestPopupShown,
    loadPopupManagerState,
    POPUP_CONFIG,
    POPUP_INTERVAL_DAYS,
    PopupManagerState,
    POPUP_SCHEDULE,
    PopupId,
    resetPopupManagerState,
    setForcedPopupId,
} from '../popupSchedule';
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

type PopupDebugItem = {
    id: PopupId;
    label: string;
    order: number;
    dismissed?: boolean;
    lastShownAt?: number;
    snoozeUntil?: number;
    readyAt?: number;
    isNext: boolean;
    isForced?: boolean;
};

type ManualPopupStatus = 'scheduled' | 'active' | 'expired';

type ManualPopupItem = {
    id: string;
    title: string;
    eventName: string;
    createdAt?: number;
    publishedAt?: number;
    expiresAt?: number;
    eventEndsAt?: number;
    status: ManualPopupStatus;
    source: EventPopup;
    createdAfterInstall?: boolean;
    dismissed?: boolean;
    seenAt?: number;
    hasSeen?: boolean;
};

type PopupNextSummary = {
    id: PopupId;
    label: string;
    readyAt: number;
    daysUntil: number;
};

type PopupStatusTone = 'ready' | 'snoozed' | 'dismissed' | 'shown' | 'pending';
type PopupStatusCounts = Record<PopupStatusTone, number>;

const POPUP_ICON_MAP: Record<PopupId, { icon: string; color: string; bg: string }> = {
    list_view_intro: { icon: 'list', color: colors.accentBlue, bg: colors.accentBlueSoft },
    whatsapp_group: { icon: 'whatsapp', color: colors.accentOrange, bg: colors.accentOrangeSoft },
    rate_app: { icon: 'star', color: colors.accentPurple, bg: colors.accentPurpleSoft },
    newsletter_signup: { icon: 'envelope-open-text', color: colors.accentSkyDeep, bg: colors.accentSkySoft },
};

const MANUAL_POPUP_ICON = {
    icon: 'bullhorn',
    color: colors.brandPurpleDark,
    bg: colors.surfaceLavenderAlt,
};

const EVENT_POPUP_HIDE_KEY_PREFIX = 'event_popup_hide_';
const EVENT_POPUP_SEEN_KEY_PREFIX = 'event_popup_seen_';
const EVENT_POPUP_FORCE_KEY = 'popup_manager_force_event_popup';

const getEventPopupHideKey = (id: string) => `${EVENT_POPUP_HIDE_KEY_PREFIX}${id}`;
const getEventPopupSeenKey = (id: string) => `${EVENT_POPUP_SEEN_KEY_PREFIX}${id}`;

const MANUAL_POPUP_STATUS_STYLES: Record<
    ManualPopupStatus,
    { label: string; color: string; bg: string; border: string }
> = {
    scheduled: {
        label: 'Scheduled',
        color: colors.brandPurpleDark,
        bg: colors.surfaceLavender,
        border: colors.borderLavenderAlt,
    },
    active: {
        label: 'Live',
        color: colors.success,
        bg: 'rgba(46,125,50,0.12)',
        border: 'rgba(46,125,50,0.25)',
    },
    expired: {
        label: 'Expired',
        color: colors.textSlate,
        bg: colors.surfaceMuted,
        border: colors.borderMutedLight,
    },
};

const POPUP_STATUS_STYLES: Record<PopupStatusTone, { label: string; color: string; bg: string; border: string }> = {
    ready: {
        label: 'Ready',
        color: colors.success,
        bg: 'rgba(46,125,50,0.12)',
        border: 'rgba(46,125,50,0.25)',
    },
    snoozed: {
        label: 'Snoozed',
        color: colors.warning,
        bg: colors.surfaceWarning,
        border: colors.borderGoldLight,
    },
    dismissed: {
        label: 'Dismissed',
        color: colors.danger,
        bg: colors.surfaceRoseSoft,
        border: colors.borderRose,
    },
    shown: {
        label: 'Seen',
        color: colors.accentBlue,
        bg: colors.surfaceInfo,
        border: colors.accentBlueBorder,
    },
    pending: {
        label: 'Queued',
        color: colors.brandTextMuted,
        bg: colors.surfaceLavenderLight,
        border: colors.borderLavenderSoft,
    },
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
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const { authUserId, userProfile } = useUserContext();
    const { allEvents } = useCalendarContext();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const { data: publishedEventPopups = [], isLoading: isLoadingPublishedEventPopups, error: publishedEventPopupsError } =
        useFetchEventPopups({ status: 'published' });
    const { data: activeEventPopups = [], isLoading: isLoadingActiveEventPopups } = useFetchActiveEventPopups();
    const [notificationExpanded, setNotificationExpanded] = useState(true);
    const [popupExpanded, setPopupExpanded] = useState(true);
    const [debugStatus, setDebugStatus] = useState<string | null>(null);
    const [notificationDebugLines, setNotificationDebugLines] = useState<string[]>([]);
    const [popupDebugLines, setPopupDebugLines] = useState<string[]>([]);
    const [popupDebugItems, setPopupDebugItems] = useState<PopupDebugItem[]>([]);
    const [popupDebugStatus, setPopupDebugStatus] = useState<string | null>(null);
    const [popupNextSummary, setPopupNextSummary] = useState<PopupNextSummary | null>(null);
    const [popupInstallAt, setPopupInstallAt] = useState<number | null>(null);
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

    const refreshPopupDebugInfo = useCallback(
        async (context?: string) => {
            if (!canAccess) return;
            const lines: string[] = [];
            if (context) {
                lines.push(`Context: ${context}`);
            }

            const now = Date.now();

            try {
                const popupState = await loadPopupManagerState();
                const nextScheduled = POPUP_SCHEDULE.find((popup) => !popupState.popups[popup.id]?.dismissed) ?? null;
                const forcedId = await getForcedPopupId();
                const projectedReadyAt = buildPopupProjection(popupState, now);

                lines.push(`Popup gap: ${POPUP_INTERVAL_DAYS} days`);
                if (popupState.firstSeenAt) {
                    lines.push(`First seen: ${formatPopupTimestamp(popupState.firstSeenAt)}`);
                } else {
                    lines.push('First seen: unknown');
                }
                setPopupInstallAt(popupState.firstSeenAt ?? null);

                const latest = getLatestPopupShown(popupState);
                if (latest) {
                    lines.push(
                        `Last local popup shown: ${POPUP_CONFIG[latest.id].label} (${latest.id}) at ${formatPopupTimestamp(latest.at)}`
                    );
                } else {
                    lines.push('Last local popup shown: none');
                }

                if (forcedId) {
                    lines.push(`Forced popup: ${POPUP_CONFIG[forcedId].label} (${forcedId})`);
                }

                if (nextScheduled) {
                    const readyAt = projectedReadyAt[nextScheduled.id] ?? now;
                    const daysUntil = getDaysFromNow(readyAt, now);
                    lines.push(
                        `Next local popup: ${POPUP_CONFIG[nextScheduled.id].label} (${nextScheduled.id}) ready ${formatPopupReadyAt(readyAt, now)}`
                    );
                    setPopupNextSummary({
                        id: nextScheduled.id,
                        label: POPUP_CONFIG[nextScheduled.id].label,
                        readyAt,
                        daysUntil,
                    });
                } else {
                    lines.push('Next local popup: none');
                    setPopupNextSummary(null);
                }

                const items = POPUP_SCHEDULE.map((popup, index) => {
                    const popupEntry = popupState.popups[popup.id] ?? {};
                    const isNext = nextScheduled?.id === popup.id;
                    const isForced = forcedId === popup.id;
                    const snoozeUntil = popupEntry.snoozeUntil && popupEntry.snoozeUntil > now
                        ? popupEntry.snoozeUntil
                        : undefined;
                    const readyAt = popupEntry.dismissed ? undefined : projectedReadyAt[popup.id];
                    return {
                        id: popup.id,
                        label: popup.label,
                        order: index + 1,
                        dismissed: popupEntry.dismissed,
                        lastShownAt: popupEntry.lastShownAt,
                        snoozeUntil,
                        readyAt,
                        isNext,
                        isForced,
                    };
                });

                setPopupDebugLines(lines);
                setPopupDebugItems(items);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                lines.push(`Popup state: error ${message}`);
                setPopupDebugLines(lines);
                setPopupDebugItems([]);
                setPopupNextSummary(null);
                setPopupInstallAt(null);
            }
        },
        [canAccess]
    );

    useEffect(() => {
        if (!canAccess) return;
        void refreshNotificationDebugInfo('focus');
    }, [canAccess, refreshNotificationDebugInfo]);

    useEffect(() => {
        if (!canAccess) return;
        void refreshPopupDebugInfo('focus');
    }, [canAccess, refreshPopupDebugInfo]);

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

    const onPressResetPopups = useCallback(() => {
        void (async () => {
            await resetPopupManagerState();
            setPopupDebugStatus('Popup history reset.');
            await refreshPopupDebugInfo('reset popups');
        })();
    }, [refreshPopupDebugInfo]);

    const onPressShowPopup = useCallback((popupId: PopupId) => {
        void (async () => {
            await setForcedPopupId(popupId);
            setPopupDebugStatus(`Queued ${POPUP_CONFIG[popupId].label} popup. Opening Calendar...`);
            navigateToTab(navigation, 'Calendar');
        })();
    }, [navigation]);

    const onPressShowManualPopup = useCallback((popup: EventPopup) => {
        void (async () => {
            await AsyncStorage.setItem(EVENT_POPUP_FORCE_KEY, JSON.stringify(popup));
            setPopupDebugStatus(`Queued ${popup.title} special event popup. Opening Calendar...`);
            navigateToTab(navigation, 'Calendar');
        })();
    }, [navigation]);

    const now = Date.now();
    const manualPopupSource = isAdmin ? publishedEventPopups : activeEventPopups;
    const manualPopupsLoading = isAdmin ? isLoadingPublishedEventPopups : isLoadingActiveEventPopups;
    const manualPopupsError = isAdmin ? publishedEventPopupsError : null;
    const [manualPopupStateMap, setManualPopupStateMap] = useState<Record<string, Pick<ManualPopupItem, 'dismissed' | 'seenAt'>>>(
        {}
    );

    useEffect(() => {
        if (!isFocused) return;
        let mounted = true;
        if (!manualPopupSource.length) {
            setManualPopupStateMap({});
            return () => {
                mounted = false;
            };
        }

        const ids = manualPopupSource.map((popup) => popup.id).filter(Boolean);
        const keys = [
            ...ids.map(getEventPopupHideKey),
            ...ids.map(getEventPopupSeenKey),
        ];

        AsyncStorage.multiGet(keys).then((entries) => {
            if (!mounted) return;
            const next: Record<string, Pick<ManualPopupItem, 'dismissed' | 'seenAt'>> = {};
            entries.forEach(([key, value]) => {
                if (!value) return;
                if (key.startsWith(EVENT_POPUP_HIDE_KEY_PREFIX)) {
                    const id = key.replace(EVENT_POPUP_HIDE_KEY_PREFIX, '');
                    if (!id) return;
                    next[id] = { ...next[id], dismissed: value === 'true' };
                    return;
                }
                if (key.startsWith(EVENT_POPUP_SEEN_KEY_PREFIX)) {
                    const id = key.replace(EVENT_POPUP_SEEN_KEY_PREFIX, '');
                    const seenAt = Number(value);
                    if (!id || Number.isNaN(seenAt) || seenAt <= 0) return;
                    next[id] = { ...next[id], seenAt };
                }
            });
            setManualPopupStateMap(next);
        });

        return () => {
            mounted = false;
        };
    }, [isFocused, manualPopupSource]);
    const manualPopupItems = useMemo(() => {
        if (!manualPopupSource.length) return [];
        const items = manualPopupSource.map((popup) =>
            buildManualPopupItem(popup, now, popupInstallAt, manualPopupStateMap[popup.id])
        );
        const statusOrder: Record<ManualPopupStatus, number> = {
            active: 0,
            scheduled: 1,
            expired: 2,
        };

        return items.sort((a, b) => {
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;
            return (a.publishedAt ?? 0) - (b.publishedAt ?? 0);
        });
    }, [manualPopupSource, now, popupInstallAt, manualPopupStateMap]);
    const nextManualPopup = useMemo(() => {
        const candidates = manualPopupItems.filter(
            (item) => item.status !== 'expired' && !item.createdAfterInstall
        );
        if (!candidates.length) return null;
        return candidates.reduce<{
            label: string;
            readyAt: number;
            daysUntil: number;
        } | null>((best, item) => {
            const readyAt = item.status === 'scheduled'
                ? item.publishedAt ?? now
                : now;
            if (!best || readyAt < best.readyAt) {
                return {
                    label: item.title,
                    readyAt,
                    daysUntil: getDaysFromNow(readyAt, now),
                };
            }
            return best;
        }, null);
    }, [manualPopupItems, now]);
    const overallNextSummary = useMemo(() => {
        if (!popupNextSummary && !nextManualPopup) return null;
        if (!nextManualPopup) {
            return popupNextSummary
                ? { ...popupNextSummary, source: 'local' as const }
                : null;
        }
        if (!popupNextSummary) {
            return { ...nextManualPopup, source: 'manual' as const };
        }
        if (popupNextSummary.readyAt <= nextManualPopup.readyAt) {
            return { ...popupNextSummary, source: 'local' as const };
        }
        return { ...nextManualPopup, source: 'manual' as const };
    }, [nextManualPopup, popupNextSummary]);
    const popupStats = getPopupStats(popupDebugItems, now);
    const popupStatCards = [
        {
            key: 'total',
            label: 'Total',
            value: popupDebugItems.length,
            color: colors.brandPurpleDark,
            bg: colors.surfaceLavender,
            border: colors.borderLavenderAlt,
        },
        {
            key: 'ready',
            label: 'Ready',
            value: popupStats.ready,
            ...POPUP_STATUS_STYLES.ready,
        },
        {
            key: 'snoozed',
            label: 'Snoozed',
            value: popupStats.snoozed,
            ...POPUP_STATUS_STYLES.snoozed,
        },
        {
            key: 'dismissed',
            label: 'Dismissed',
            value: popupStats.dismissed,
            ...POPUP_STATUS_STYLES.dismissed,
        },
    ];
    const popupNextIcon = overallNextSummary?.source === 'manual'
        ? MANUAL_POPUP_ICON
        : overallNextSummary && 'id' in overallNextSummary
            ? POPUP_ICON_MAP[overallNextSummary.id]
            : null;

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

                    {canAccess && (
                        <AccordionSection
                            title="Popups"
                            subtitle="Queue order and schedule timing"
                            expanded={popupExpanded}
                            onToggle={() => setPopupExpanded((prev) => !prev)}
                        >
                            <View style={styles.popupActionRow}>
                                <TouchableOpacity style={styles.secondaryButton} onPress={onPressResetPopups}>
                                    <Text style={styles.secondaryButtonText}>Reset popup history</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => void refreshPopupDebugInfo('manual refresh')}
                                >
                                    <Text style={styles.secondaryButtonText}>Refresh popup debug</Text>
                                </TouchableOpacity>
                            </View>
                            {!!popupDebugStatus && (
                                <View style={styles.popupStatusBanner}>
                                    <Text style={styles.popupStatusBannerText}>{popupDebugStatus}</Text>
                                </View>
                            )}
                            <View style={styles.popupStatsRow}>
                                {popupStatCards.map((card) => (
                                    <View
                                        key={card.key}
                                        style={[
                                            styles.popupStatCard,
                                            { backgroundColor: card.bg, borderColor: card.border },
                                        ]}
                                    >
                                        <Text style={[styles.popupStatValue, { color: card.color }]}>
                                            {card.value}
                                        </Text>
                                        <Text style={styles.popupStatLabel}>{card.label}</Text>
                                    </View>
                                ))}
                            </View>
                            {overallNextSummary && popupNextIcon && (
                                <View style={styles.popupNextCard}>
                                    <View style={styles.popupNextHeader}>
                                        <Text style={styles.popupNextLabel}>Next popup</Text>
                                        <View style={styles.popupNextPillRow}>
                                            <View style={styles.popupNextPill}>
                                                <Text style={styles.popupNextPillText}>
                                                    {formatDaysUntilLabel(overallNextSummary.daysUntil)}
                                                </Text>
                                            </View>
                                            <View style={styles.popupNextSourcePill}>
                                                <Text style={styles.popupNextSourceText}>
                                                    {overallNextSummary.source === 'manual' ? 'Special' : 'Local'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.popupNextContent}>
                                        <View
                                            style={[
                                                styles.popupNextIconWrap,
                                                { backgroundColor: popupNextIcon.bg },
                                            ]}
                                        >
                                            <FAIcon
                                                name={popupNextIcon.icon}
                                                size={18}
                                                color={popupNextIcon.color}
                                            />
                                        </View>
                                        <View style={styles.popupNextInfo}>
                                            <Text style={styles.popupNextTitle}>{overallNextSummary.label}</Text>
                                            <Text style={styles.popupNextMeta}>
                                                {`Ready: ${formatPopupTimestamp(overallNextSummary.readyAt)}`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                            <View style={styles.popupQueueSection}>
                                <Text style={styles.popupQueueHeader}>Popup queue</Text>
                                {popupDebugItems.length === 0 ? (
                                    <Text style={styles.debugMeta}>No popup data loaded.</Text>
                                ) : (
                                    <View style={styles.popupQueueGrid}>
                                        {popupDebugItems.map((popup) => {
                                            const statusTone = getPopupStatusTone(popup, now);
                                            const statusStyle = POPUP_STATUS_STYLES[statusTone];
                                            const statusLabel = getPopupStatusLabel(popup, statusTone);
                                            const metaLines = getPopupMetaLines(popup, now);
                                            const icon = POPUP_ICON_MAP[popup.id];
                                            return (
                                                <View
                                                    key={popup.id}
                                                    style={[
                                                        styles.popupCard,
                                                        popup.isNext && styles.popupCardNext,
                                                    ]}
                                                >
                                                    <View style={styles.popupCardHeader}>
                                                        <View
                                                            style={[
                                                                styles.popupIconWrap,
                                                                { backgroundColor: icon.bg },
                                                            ]}
                                                        >
                                                            <FAIcon
                                                                name={icon.icon}
                                                                size={16}
                                                                color={icon.color}
                                                            />
                                                        </View>
                                                        <View style={styles.popupCardTitleBlock}>
                                                            <Text style={styles.popupCardTitle}>{popup.label}</Text>
                                                            <Text style={styles.popupCardSubtitle}>
                                                                {`#${popup.order} · ${popup.id}`}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={[
                                                                styles.popupStatusPill,
                                                                {
                                                                    backgroundColor: statusStyle.bg,
                                                                    borderColor: statusStyle.border,
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.popupStatusText,
                                                                    { color: statusStyle.color },
                                                                ]}
                                                            >
                                                                {statusLabel}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {(popup.isNext || popup.isForced) && (
                                                        <View style={styles.popupBadgeRow}>
                                                            {popup.isNext && (
                                                                <View style={styles.popupNextBadge}>
                                                                    <Text style={styles.popupNextBadgeText}>
                                                                        Up next
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {popup.isForced && (
                                                                <View style={styles.popupForcedBadge}>
                                                                    <Text style={styles.popupForcedBadgeText}>
                                                                        Forced
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    )}
                                                    <View style={styles.popupCardMetaRow}>
                                                        {metaLines.map((line) => (
                                                            <Text
                                                                key={`${popup.id}-${line}`}
                                                                style={styles.popupCardMeta}
                                                            >
                                                                {line}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.popupShowButton}
                                                        onPress={() => onPressShowPopup(popup.id)}
                                                    >
                                                        <Text style={styles.popupShowButtonText}>Show now</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                            <View style={styles.popupManualSection}>
                                <Text style={styles.popupQueueHeader}>Special Event Popups</Text>
                                {manualPopupsLoading && (
                                    <Text style={styles.debugMeta}>Loading special event popups...</Text>
                                )}
                                {!!manualPopupsError && (
                                    <Text style={styles.debugMeta}>
                                        Special event popups unavailable (admin access required).
                                    </Text>
                                )}
                                {!manualPopupsLoading && !manualPopupsError && manualPopupItems.length === 0 && (
                                    <Text style={styles.debugMeta}>No special event popups scheduled.</Text>
                                )}
                                <View style={styles.manualPopupList}>
                                    {manualPopupItems.map((popup) => {
                                        const statusStyle = MANUAL_POPUP_STATUS_STYLES[popup.status];
                                        const metaLines = getManualPopupMetaLines(popup, now);
                                        return (
                                            <View key={popup.id} style={styles.popupCard}>
                                                <View style={styles.popupCardHeader}>
                                                    <View
                                                        style={[
                                                            styles.popupIconWrap,
                                                            { backgroundColor: MANUAL_POPUP_ICON.bg },
                                                        ]}
                                                    >
                                                        <FAIcon
                                                            name={MANUAL_POPUP_ICON.icon}
                                                            size={16}
                                                            color={MANUAL_POPUP_ICON.color}
                                                        />
                                                    </View>
                                                    <View style={styles.popupCardTitleBlock}>
                                                        <Text style={styles.popupCardTitle}>{popup.title}</Text>
                                                        <Text style={styles.popupCardSubtitle}>
                                                            {`Event · ${popup.eventName}`}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={[
                                                            styles.popupStatusPill,
                                                            {
                                                                backgroundColor: statusStyle.bg,
                                                                borderColor: statusStyle.border,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.popupStatusText,
                                                                { color: statusStyle.color },
                                                            ]}
                                                        >
                                                            {statusStyle.label}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={styles.popupCardMetaRow}>
                                                    {metaLines.map((line) => (
                                                        <Text
                                                            key={`${popup.id}-${line}`}
                                                            style={styles.popupCardMeta}
                                                        >
                                                            {line}
                                                        </Text>
                                                    ))}
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.popupShowButton}
                                                    onPress={() => onPressShowManualPopup(popup.source)}
                                                >
                                                    <Text style={styles.popupShowButtonText}>Show now</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                            {popupDebugLines.length > 0 && (
                                <View style={styles.popupDetailsCard}>
                                    <Text style={styles.popupDetailsTitle}>Details</Text>
                                    {popupDebugLines.map((line, index) => (
                                        <Text key={`${line}-${index}`} style={styles.debugMeta}>
                                            {line}
                                        </Text>
                                    ))}
                                </View>
                            )}
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
    popupActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    popupStatusBanner: {
        backgroundColor: colors.surfaceLavenderStrong,
        borderRadius: radius.md,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    popupStatusBannerText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    popupStatsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    popupStatCard: {
        flex: 1,
        minWidth: 120,
        borderRadius: radius.lg,
        padding: spacing.smPlus,
        borderWidth: 1,
    },
    popupStatValue: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    popupStatLabel: {
        fontSize: fontSizes.xs,
        color: colors.brandTextMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    popupNextCard: {
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.lg,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        gap: spacing.sm,
    },
    popupNextHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    popupNextLabel: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.brandIndigo,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontFamily: fontFamilies.body,
    },
    popupNextPillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    popupNextPill: {
        backgroundColor: colors.white,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    popupNextPillText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    popupNextSourcePill: {
        backgroundColor: colors.surfaceLavenderLight,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    popupNextSourceText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    popupNextContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    popupNextIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    popupNextInfo: {
        flex: 1,
    },
    popupNextTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    popupNextMeta: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    popupQueueSection: {
        gap: spacing.sm,
    },
    popupQueueHeader: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    popupQueueGrid: {
        gap: spacing.sm,
    },
    popupManualSection: {
        gap: spacing.sm,
    },
    manualPopupList: {
        gap: spacing.sm,
    },
    popupCard: {
        backgroundColor: colors.surfaceWhiteStrong,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        gap: spacing.sm,
        ...shadows.card,
    },
    popupCardNext: {
        borderColor: colors.borderLavenderActive,
        backgroundColor: colors.surfaceLavenderLight,
    },
    popupCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    popupIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupCardTitleBlock: {
        flex: 1,
        gap: spacing.xxs,
    },
    popupCardTitle: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    popupCardSubtitle: {
        fontSize: fontSizes.xs,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    popupStatusPill: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
    },
    popupStatusText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    popupBadgeRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    popupNextBadge: {
        backgroundColor: colors.surfaceLavenderAlt,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    popupNextBadgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    popupForcedBadge: {
        backgroundColor: colors.surfaceRoseSoft,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
        borderColor: colors.borderRose,
    },
    popupForcedBadgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.danger,
        fontFamily: fontFamilies.body,
    },
    popupCardMetaRow: {
        gap: spacing.xxs,
    },
    popupCardMeta: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    popupShowButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        alignSelf: 'flex-start',
    },
    popupShowButtonText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    popupDetailsCard: {
        backgroundColor: colors.surfaceWhiteStrong,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        gap: spacing.xs,
    },
    popupDetailsTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontFamily: fontFamilies.body,
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

const formatPopupTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'unknown';
    return new Date(timestamp).toLocaleString();
};

const DAY_MS = 24 * 60 * 60 * 1000;

const getDaysFromNow = (timestamp: number, now: number) => (timestamp - now) / DAY_MS;

const formatDaysUntil = (daysUntil: number) => {
    if (daysUntil < 1) return '<1 day';
    const rounded = Math.round(daysUntil * 10) / 10;
    return `${rounded} ${rounded === 1 ? 'day' : 'days'}`;
};

const formatDaysUntilLabel = (daysUntil: number) => {
    if (daysUntil <= 0) return 'now';
    return `in ${formatDaysUntil(daysUntil)}`;
};

const formatPopupReadyAt = (timestamp: number, now: number) => {
    if (!timestamp) return 'unknown';
    const label = formatDaysUntilLabel(getDaysFromNow(timestamp, now));
    return `${label} (${new Date(timestamp).toLocaleString()})`;
};

const buildPopupProjection = (state: PopupManagerState, now: number) => {
    const projections: Partial<Record<PopupId, number>> = {};
    const firstSeenAt = state.firstSeenAt ?? now;
    let projectedLastShownAt = state.lastPopupShownAt ?? 0;
    const intervalMs = POPUP_INTERVAL_DAYS * DAY_MS;

    POPUP_SCHEDULE.forEach((popup) => {
        const popupState = state.popups[popup.id] ?? {};
        if (popupState.dismissed) return;
        const baseReadyAt = popup.useInterval === false
            ? firstSeenAt
            : projectedLastShownAt
                ? projectedLastShownAt + intervalMs
                : firstSeenAt;
        const initialReadyAt = firstSeenAt + popup.initialDelayMs;
        const snoozeUntil = popupState.snoozeUntil ?? 0;
        let readyAt = Math.max(baseReadyAt, initialReadyAt, snoozeUntil);
        if (readyAt < now) {
            readyAt = now;
        }
        projections[popup.id] = readyAt;
        projectedLastShownAt = readyAt;
    });

    return projections;
};

const parseIsoTimestamp = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
};

const getManualPopupStatus = (
    publishedAt: number | undefined,
    expiresAt: number | undefined,
    eventEndsAt: number | undefined,
    now: number
) => {
    if (eventEndsAt && eventEndsAt <= now) return 'expired';
    if (expiresAt && expiresAt <= now) return 'expired';
    if (publishedAt && publishedAt > now) return 'scheduled';
    return 'active';
};

const buildManualPopupItem = (
    popup: EventPopup,
    now: number,
    installAt?: number | null,
    localState?: Pick<ManualPopupItem, 'dismissed' | 'seenAt'>
): ManualPopupItem => {
    const createdAt = parseIsoTimestamp(popup.created_at);
    const publishedAt = parseIsoTimestamp(popup.published_at);
    const expiresAt = parseIsoTimestamp(popup.expires_at);
    const eventEndsAt = parseIsoTimestamp(popup.event?.end_date ?? popup.event?.start_date);
    const eventName = popup.event?.name || (popup.event_id ? `Event #${popup.event_id}` : 'Event');
    const status = getManualPopupStatus(publishedAt, expiresAt, eventEndsAt, now);
    const createdAfterInstall = !!(installAt && createdAt && createdAt > installAt);
    const dismissed = localState?.dismissed;
    const seenAt = localState?.seenAt;
    const hasSeen = !!seenAt || !!dismissed;

    return {
        id: popup.id,
        title: popup.title,
        eventName,
        createdAt,
        publishedAt,
        expiresAt,
        eventEndsAt,
        status,
        source: popup,
        createdAfterInstall,
        dismissed,
        seenAt,
        hasSeen,
    };
};

const getPopupStatusTone = (popup: PopupDebugItem, now: number): PopupStatusTone => {
    if (popup.dismissed) return 'dismissed';
    if (popup.snoozeUntil) return 'snoozed';
    if (popup.isNext && popup.readyAt && popup.readyAt <= now) return 'ready';
    if (popup.lastShownAt && !popup.isNext) return 'shown';
    return 'pending';
};

const getPopupStatusLabel = (popup: PopupDebugItem, tone: PopupStatusTone) => {
    if (popup.isNext && tone === 'pending') return 'Up next';
    if (popup.isNext && tone === 'ready') return 'Ready now';
    return POPUP_STATUS_STYLES[tone].label;
};

const getPopupMetaLines = (popup: PopupDebugItem, now: number) => {
    const lines: string[] = [];
    if (popup.lastShownAt) {
        lines.push(`Last shown ${formatPopupTimestamp(popup.lastShownAt)}`);
    } else {
        lines.push('Never shown yet');
    }

    if (popup.dismissed) {
        lines.push('Dismissed from queue');
        return lines;
    }

    if (popup.snoozeUntil) {
        lines.push(`Snoozed until ${formatPopupTimestamp(popup.snoozeUntil)}`);
        return lines;
    }

    if (popup.readyAt) {
        const label = popup.isNext ? 'Ready' : 'Earliest show';
        lines.push(`${label} ${formatPopupReadyAt(popup.readyAt, now)}`);
    } else if (popup.isNext) {
        lines.push('Next in queue');
    }

    return lines;
};

const getManualPopupMetaLines = (popup: ManualPopupItem, now: number) => {
    const lines: string[] = [];
    if (popup.createdAt) {
        lines.push(`Created ${formatPopupTimestamp(popup.createdAt)}`);
    }
    if (popup.createdAfterInstall) {
        lines.push('Created after install (won\'t auto show)');
    }
    if (popup.publishedAt) {
        lines.push(
            popup.status === 'scheduled'
                ? `Starts ${formatPopupReadyAt(popup.publishedAt, now)}`
                : `Published ${formatPopupTimestamp(popup.publishedAt)}`
        );
    } else {
        lines.push('Published: unknown');
    }

    lines.push(
        popup.expiresAt ? `Expires ${formatPopupTimestamp(popup.expiresAt)}` : 'No expiry'
    );
    if (popup.eventEndsAt) {
        lines.push(
            popup.eventEndsAt <= now
                ? `Event ended ${formatPopupTimestamp(popup.eventEndsAt)}`
                : `Event ends ${formatPopupTimestamp(popup.eventEndsAt)}`
        );
    }

    if (popup.seenAt) {
        lines.push(`Seen ${formatPopupTimestamp(popup.seenAt)}`);
    } else if (popup.hasSeen) {
        lines.push('Seen (time unknown)');
    } else {
        lines.push('Never seen');
    }

    lines.push(popup.dismissed ? 'Dismissed/Opened: yes' : 'Dismissed/Opened: no');

    return lines;
};

const getPopupStats = (items: PopupDebugItem[], now: number): PopupStatusCounts => {
    const counts: PopupStatusCounts = {
        ready: 0,
        snoozed: 0,
        dismissed: 0,
        shown: 0,
        pending: 0,
    };

    items.forEach((popup) => {
        const tone = getPopupStatusTone(popup, now);
        counts[tone] += 1;
    });

    return counts;
};

export default DebugScreen;
