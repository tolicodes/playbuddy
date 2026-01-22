import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';
import { useUserContext } from '../Auth/hooks/UserContext';
import { NewsletterSignupModal } from '../NewsletterSignupModal';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { EventListViewIntroModal } from '../Calendar/ListView/EventListViewIntroModal';
import { setEventListIntroSeen, setEventListViewMode } from '../Calendar/ListView/eventListViewMode';
import { buildRecommendations, type RecommendationPick } from '../Calendar/hooks/recommendations';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { useFetchFollows } from '../../Common/db-axios/useFollows';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { useFetchAttendees } from '../../Common/db-axios/useAttendees';
import { useFetchActiveEventPopups, useFetchEventPopups } from '../../Common/db-axios/useEventPopups';
import { useImportSources } from '../../Common/db-axios/useImportSources';
import type { Event, EventAttendees, EventPopup, ImportSource } from '../../Common/types/commonTypes';
import type { NavStack } from '../../Common/Nav/NavStackType';
import { navigateToTab } from '../../Common/Nav/navigationHelpers';
import { ADMIN_EMAILS, API_BASE_URL } from '../../config';
import { TZ } from '../Calendar/ListView/calendarNavUtils';
import { DiscoverGameModal } from '../DiscoverGameModal';
import { EdgePlayGroupModal } from '../EdgePlayGroupModal';
import { EventPopupModal } from '../EventPopupModal';
import { useGuestSaveModal } from '../GuestSaveModal';
import { RateAppModal } from '../RateAppModal';
import { ShareCalendarModal } from '../ShareCalendarModal';
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
    getPushNotificationsPrompted,
    scheduleOrganizerNotifications,
    setPushNotificationsEnabled,
    setPushNotificationsPrompted,
    unregisterRemotePushToken,
} from '../../Common/notifications/organizerPushNotifications';
import {
    promptDiscoverGameNotifications,
    resetDiscoverGameNotifications,
} from '../../Common/notifications/discoverGameNotifications';

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
    hasEvent: boolean;
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

type OverallNextSummary =
    | (PopupNextSummary & { source: 'local' })
    | { label: string; readyAt: number; daysUntil: number; source: 'manual' };

type PopupStatusTone = 'ready' | 'snoozed' | 'dismissed' | 'shown' | 'pending';
type PopupStatusCounts = Record<PopupStatusTone, number>;

const POPUP_ICON_MAP: Record<PopupId, { icon: string; color: string; bg: string }> = {
    list_view_intro: { icon: 'list', color: colors.accentBlue, bg: colors.accentBlueSoft },
    calendar_add_coach: { icon: 'calendar-plus', color: colors.accentTeal, bg: 'rgba(20, 184, 166, 0.12)' },
    whatsapp_group: { icon: 'whatsapp', color: colors.accentOrange, bg: colors.accentOrangeSoft },
    rate_app: { icon: 'star', color: colors.accentPurple, bg: colors.accentPurpleSoft },
    discover_game: { icon: 'gamepad', color: colors.accentGreen, bg: 'rgba(22, 163, 74, 0.12)' },
    newsletter_signup: { icon: 'envelope-open-text', color: colors.accentBlue, bg: colors.accentBlueSoft },
    buddy_list_coach: { icon: 'user-friends', color: colors.accentSkyDeep, bg: colors.accentSkySoft },
    share_calendar: { icon: 'calendar-check', color: colors.accentGreen, bg: 'rgba(22, 163, 74, 0.12)' },
};

const MANUAL_POPUP_ICON = {
    icon: 'bullhorn',
    color: colors.brandPurpleDark,
    bg: colors.surfaceLavenderAlt,
};

const EVENT_POPUP_HIDE_KEY_PREFIX = 'event_popup_hide_';
const EVENT_POPUP_SEEN_KEY_PREFIX = 'event_popup_seen_';
const CALENDAR_ADD_COACH_COMPLETED_KEY = 'calendar_add_coach_completed_v1';

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

const EVENT_STATUS_PREVIEW = 6;
const SOURCE_STATUS_PREVIEW = 6;

const hasValidAttendee = (entry: EventAttendees, authUserId?: string | null) => {
    const seen = new Set<string>();
    return (entry.attendees ?? []).some((attendee) => {
        const attendeeId = attendee?.id;
        if (!attendeeId || seen.has(attendeeId)) return false;
        if (authUserId && attendeeId === authUserId) return false;
        const name = attendee?.name?.trim();
        if (name === '0') return false;
        seen.add(attendeeId);
        return true;
    });
};

export const DebugScreen = () => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const { authUserId, userProfile, currentDeepLink } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const { allEvents, availableCardsToSwipe, wishlistEvents, wishlistEntryMap } = useCalendarContext();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const { data: attendeeGroups = [] } = useFetchAttendees();
    const { data: publishedEventPopups = [], isLoading: isLoadingPublishedEventPopups, error: publishedEventPopupsError } =
        useFetchEventPopups({ status: 'published' });
    const { data: activeEventPopups = [], isLoading: isLoadingActiveEventPopups } = useFetchActiveEventPopups();
    const [notificationExpanded, setNotificationExpanded] = useState(true);
    const [statusExpanded, setStatusExpanded] = useState(false);
    const [popupExpanded, setPopupExpanded] = useState(true);
    const [recommendationsExpanded, setRecommendationsExpanded] = useState(false);
    const [debugPopupId, setDebugPopupId] = useState<PopupId | null>(null);
    const [debugEventPopup, setDebugEventPopup] = useState<EventPopup | null>(null);
    const [debugStatus, setDebugStatus] = useState<string | null>(null);
    const [notificationDebugLines, setNotificationDebugLines] = useState<string[]>([]);
    const [popupDebugLines, setPopupDebugLines] = useState<string[]>([]);
    const [popupDebugItems, setPopupDebugItems] = useState<PopupDebugItem[]>([]);
    const [popupDebugStatus, setPopupDebugStatus] = useState<string | null>(null);
    const [popupNextSummary, setPopupNextSummary] = useState<PopupNextSummary | null>(null);
    const [popupInstallAt, setPopupInstallAt] = useState<number | null>(null);
    const [cacheFlushStatus, setCacheFlushStatus] = useState<string | null>(null);
    const [cacheFlushPending, setCacheFlushPending] = useState(false);
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
    const approvalStatuses = canAccess ? ['approved', 'pending', 'rejected'] : undefined;

    const {
        data: statusEvents = [],
        isLoading: isLoadingStatusEvents,
        error: statusEventsError,
        refetch: refetchStatusEvents,
    } = useFetchEvents({
        includeFacilitatorOnly: true,
        includeHiddenOrganizers: true,
        includeHidden: true,
        approvalStatuses,
    });

    const {
        data: importSources = [],
        isLoading: isLoadingImportSources,
        error: importSourcesError,
        refetch: refetchImportSources,
    } = useImportSources({ includeAll: true });

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

    const attendeeEventIds = useMemo(() => {
        const ids = new Set<number>();
        attendeeGroups.forEach((entry) => {
            if (hasValidAttendee(entry, authUserId)) {
                ids.add(entry.event_id);
            }
        });
        return ids;
    }, [attendeeGroups, authUserId]);

    const eventWithAttendees = useMemo(() => {
        const candidates = [...(availableCardsToSwipe ?? []), ...(allEvents ?? [])];
        return candidates.find((event) => attendeeEventIds.has(event.id));
    }, [availableCardsToSwipe, allEvents, attendeeEventIds]);

    const eventStatusSummary = useMemo(() => {
        const buckets: Record<'approved' | 'pending' | 'rejected' | 'unknown', Event[]> = {
            approved: [],
            pending: [],
            rejected: [],
            unknown: [],
        };
        statusEvents.forEach((event) => {
            const status = event.approval_status ?? 'approved';
            if (status === 'approved') buckets.approved.push(event);
            else if (status === 'pending') buckets.pending.push(event);
            else if (status === 'rejected') buckets.rejected.push(event);
            else buckets.unknown.push(event);
        });
        return buckets;
    }, [statusEvents]);

    const sourceStatusSummary = useMemo(() => {
        const totals = { approved: 0, pending: 0, rejected: 0, excluded: 0, total: 0 };
        const excludedSources: ImportSource[] = [];
        const rejectedSources: ImportSource[] = [];
        importSources.forEach((source) => {
            totals.total += 1;
            const status = source.approval_status ?? 'approved';
            if (status === 'approved') totals.approved += 1;
            else if (status === 'pending') totals.pending += 1;
            else if (status === 'rejected') {
                totals.rejected += 1;
                rejectedSources.push(source);
            }
            if (source.is_excluded) {
                totals.excluded += 1;
                excludedSources.push(source);
            }
        });
        return { totals, excludedSources, rejectedSources };
    }, [importSources]);

    const formatEventLabel = (event: Event) => {
        const name = event.name || `Event ${event.id}`;
        const organizer = event.organizer?.name ? ` • ${event.organizer.name}` : '';
        return `${name}${organizer}`;
    };

    const formatSourceLabel = (source: ImportSource) => {
        const identifier = source.identifier || '';
        const base = identifier ? `${source.source}: ${identifier}` : source.source;
        const status = source.approval_status || 'approved';
        return `${base} (${status}${source.is_excluded ? ', excluded' : ''})`;
    };

    const formatQueryError = (error: unknown) => {
        if (!error) return null;
        return error instanceof Error ? error.message : String(error);
    };

    const getPromoCodesForEvent = useCallback((event: Event) => {
        const deepLinkPromo =
            currentDeepLink?.type !== "generic" && currentDeepLink?.featured_event?.id === event.id
                ? currentDeepLink.featured_promo_code
                : null;
        const promoCandidates = [
            ...(deepLinkPromo ? [deepLinkPromo] : []),
            ...(event.promo_codes ?? []).filter((code) => code.scope === "event"),
            ...(event.organizer?.promo_codes ?? []).filter((code) => code.scope === "organizer"),
        ];
        const promoCodes: typeof promoCandidates = [];
        const seenPromoCodes = new Set<string>();
        for (const code of promoCandidates) {
            if (!code) continue;
            const key = code.id || code.promo_code;
            if (!key || seenPromoCodes.has(key)) continue;
            seenPromoCodes.add(key);
            promoCodes.push(code);
            if (promoCodes.length === 2) break;
        }
        return promoCodes;
    }, [currentDeepLink]);

    const recommendationResult = useMemo(() => {
        const hasPromo = (event: Event) => getPromoCodesForEvent(event).length > 0;
        return buildRecommendations({
            sourceEvents: allEvents,
            wishlistEvents,
            wishlistEntryMap,
            followedOrganizerIds,
            tz: TZ,
            hasPromo,
        });
    }, [
        allEvents,
        followedOrganizerIds,
        getPromoCodesForEvent,
        wishlistEntryMap,
        wishlistEvents,
    ]);

    const formatRecommendationPick = (pick: RecommendationPick) => {
        const promoLabel = pick.promo ? "promo" : "no promo";
        const reasonLabel = pick.reason.replace("-", " ");
        const addedAt = pick.wishlistCreatedAt ? ` • added ${pick.wishlistCreatedAt}` : "";
        const startsAt = pick.event.start_date ? ` • starts ${pick.event.start_date}` : "";
        return `${promoLabel} • ${reasonLabel} • ${formatEventLabel(pick.event)}${addedAt}${startsAt}`;
    };

    const onPressFlushEventsCache = useCallback(async () => {
        if (!canAccess || cacheFlushPending) return;
        setCacheFlushPending(true);
        setCacheFlushStatus('Flushing events cache...');
        try {
            await axios.get(`${API_BASE_URL}/events`, {
                params: { flushCache: true },
            });
            setCacheFlushStatus('Events cache flushed.');
            await refetchStatusEvents();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setCacheFlushStatus(`Events cache flush failed: ${message}`);
        } finally {
            setCacheFlushPending(false);
        }
    }, [API_BASE_URL, cacheFlushPending, canAccess, refetchStatusEvents]);

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
            let pushPromptedFlag: boolean | null = null;
            try {
                pushPromptedFlag = await getPushNotificationsPrompted();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                lines.push(`Prompted flag: error ${message}`);
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
            if (pushPromptedFlag !== null) {
                lines.push(`Push prompted flag: ${pushPromptedFlag}`);
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
                const content = {
                    ...candidate.content,
                    data: {
                        ...(candidate.content.data || {}),
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
                        ...(channelId ? { channelId } : {}),
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

    const onPressDiscoverGameNotificationPrompt = () => {
        void promptDiscoverGameNotifications({ availableCardsToSwipe });
    };

    const onPressResetDiscoverGameNotifications = () => {
        void (async () => {
            await resetDiscoverGameNotifications();
            setDebugStatus('Reset Discover Game notification state.');
            await refreshNotificationDebugInfo('reset discover game notifications');
        })();
    };

    const onPressResetNotificationPermissions = () => {
        Alert.alert(
            'Reset notifications?',
            'This clears local notification state. Turn off notifications in Settings to revoke OS permissions.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset & Open Settings',
                    onPress: () => {
                        void (async () => {
                            await cancelOrganizerNotifications();
                            try {
                                await Notifications.cancelAllScheduledNotificationsAsync();
                            } catch (error) {
                                console.warn('[notifications] failed to cancel scheduled notifications', error);
                            }
                            await unregisterRemotePushToken();
                            await setPushNotificationsEnabled(false);
                            await setPushNotificationsPrompted(false);
                            setDebugStatus('Notification state cleared. Disable OS permissions in Settings if needed.');
                            await refreshNotificationDebugInfo('reset permissions');
                            try {
                                await Linking.openSettings();
                            } catch (error) {
                                console.warn('[notifications] failed to open settings', error);
                            }
                        })();
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const onPressResetPopups = useCallback(() => {
        void (async () => {
            await resetPopupManagerState();
            setPopupDebugStatus('Popup history reset.');
            await refreshPopupDebugInfo('reset popups');
        })();
    }, [refreshPopupDebugInfo]);

    const dismissDebugPopup = useCallback(() => {
        setDebugPopupId(null);
    }, []);

    const dismissDebugEventPopup = useCallback(() => {
        setDebugEventPopup(null);
    }, []);

    const onPressShowPopup = useCallback((popupId: PopupId) => {
        if (popupId === 'buddy_list_coach') {
            setDebugEventPopup(null);
            setDebugPopupId(null);
            const targetEvent = eventWithAttendees;
            if (!targetEvent) {
                setPopupDebugStatus('No events with attendees besides you for buddy coach.');
                return;
            }
            setPopupDebugStatus(`Buddy list coach queued for ${targetEvent.name || 'event'}.`);
            void (async () => {
                await setForcedPopupId(popupId);
                navigation.navigate('Event Details', {
                    selectedEvent: targetEvent,
                    title: targetEvent.name,
                });
            })();
            return;
        }
        if (popupId === 'calendar_add_coach') {
            setDebugEventPopup(null);
            setDebugPopupId(null);
            setPopupDebugStatus(`Showing ${POPUP_CONFIG[popupId].label} popup.`);
            void (async () => {
                await setForcedPopupId(popupId);
                navigation.popToTop();
                navigateToTab(navigation, 'Calendar', { screen: 'Calendar Home' });
            })();
            return;
        }
        setDebugEventPopup(null);
        setDebugPopupId(popupId);
        setPopupDebugStatus(`Showing ${POPUP_CONFIG[popupId].label} popup.`);
    }, [eventWithAttendees, navigation]);

    const onPressShowManualPopup = useCallback((popup: EventPopup) => {
        setDebugPopupId(null);
        setDebugEventPopup(popup);
        setPopupDebugStatus(`Showing ${popup.title} message popup.`);
    }, []);

    const onPressClearCalendarAddToast = useCallback(() => {
        void (async () => {
            try {
                await AsyncStorage.removeItem(CALENDAR_ADD_COACH_COMPLETED_KEY);
                setPopupDebugStatus('Calendar add toast cleared.');
            } catch (error) {
                console.warn('[debug] failed to clear calendar add toast', error);
                setPopupDebugStatus('Unable to clear calendar add toast.');
            }
        })();
    }, []);

    const handleDebugListViewChoice = useCallback((mode: 'classic' | 'image') => {
        void setEventListViewMode(mode);
        void setEventListIntroSeen(true);
        dismissDebugPopup();
    }, [dismissDebugPopup]);

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
    const nextManualPopupItem = useMemo(() => {
        const candidates = manualPopupItems.filter(
            (item) => item.status !== 'expired' && !item.createdAfterInstall
        );
        if (!candidates.length) return null;
        return candidates.reduce<{ item: ManualPopupItem; readyAt: number } | null>((best, item) => {
            const readyAt = item.status === 'scheduled'
                ? item.publishedAt ?? now
                : now;
            if (!best || readyAt < best.readyAt) {
                return { item, readyAt };
            }
            return best;
        }, null);
    }, [manualPopupItems, now]);
    const nextManualPopupSummary = useMemo(() => {
        if (!nextManualPopupItem) return null;
        return {
            label: nextManualPopupItem.item.title,
            readyAt: nextManualPopupItem.readyAt,
            daysUntil: getDaysFromNow(nextManualPopupItem.readyAt, now),
        };
    }, [nextManualPopupItem, now]);
    const overallNextSummary = useMemo(() => {
        if (!popupNextSummary && !nextManualPopupSummary) return null;
        if (!nextManualPopupSummary) {
            return popupNextSummary
                ? { ...popupNextSummary, source: 'local' as const }
                : null;
        }
        if (!popupNextSummary) {
            return { ...nextManualPopupSummary, source: 'manual' as const };
        }
        if (popupNextSummary.readyAt <= nextManualPopupSummary.readyAt) {
            return { ...popupNextSummary, source: 'local' as const };
        }
        return { ...nextManualPopupSummary, source: 'manual' as const };
    }, [nextManualPopupSummary, popupNextSummary]);
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
    const handleShowNextPopup = useCallback(() => {
        if (!overallNextSummary) return;
        if (overallNextSummary.source === 'manual') {
            const manualItem = nextManualPopupItem?.item;
            if (!manualItem) {
                setPopupDebugStatus('Unable to locate the next special popup.');
                return;
            }
            onPressShowManualPopup(manualItem.source);
            return;
        }
        onPressShowPopup(overallNextSummary.id);
    }, [overallNextSummary, nextManualPopupItem, onPressShowManualPopup, onPressShowPopup]);

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
                            title="Event approvals"
                            subtitle="Approved, rejected, and excluded snapshot"
                            expanded={statusExpanded}
                            onToggle={() => setStatusExpanded((prev) => !prev)}
                        >
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => {
                                    void refetchStatusEvents();
                                    void refetchImportSources();
                                }}
                            >
                                <Text style={styles.secondaryButtonText}>Refresh status snapshot</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={onPressFlushEventsCache}
                                disabled={cacheFlushPending}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Flush events cache
                                </Text>
                            </TouchableOpacity>
                            {!isAdmin && (
                                <Text style={styles.debugMeta}>
                                    Admin auth required to see rejected/excluded data.
                                </Text>
                            )}
                            {(isLoadingStatusEvents || isLoadingImportSources) && (
                                <Text style={styles.debugMeta}>Loading status snapshot...</Text>
                            )}
                            {formatQueryError(statusEventsError) && (
                                <Text style={styles.debugMeta}>
                                    Event status error: {formatQueryError(statusEventsError)}
                                </Text>
                            )}
                            {formatQueryError(importSourcesError) && (
                                <Text style={styles.debugMeta}>
                                    Source status error: {formatQueryError(importSourcesError)}
                                </Text>
                            )}
                            {!!cacheFlushStatus && (
                                <Text style={styles.debugMeta}>{cacheFlushStatus}</Text>
                            )}
                            <Text style={styles.debugMeta}>
                                Events: approved {eventStatusSummary.approved.length} • pending {eventStatusSummary.pending.length} • rejected {eventStatusSummary.rejected.length} • unknown {eventStatusSummary.unknown.length}
                            </Text>
                            <Text style={styles.debugMeta}>
                                Sources: approved {sourceStatusSummary.totals.approved} • pending {sourceStatusSummary.totals.pending} • rejected {sourceStatusSummary.totals.rejected} • excluded {sourceStatusSummary.totals.excluded} • total {sourceStatusSummary.totals.total}
                            </Text>
                            <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
                                <Text style={styles.debugMeta}>Rejected events (first {EVENT_STATUS_PREVIEW}):</Text>
                                {eventStatusSummary.rejected.length ? (
                                    eventStatusSummary.rejected.slice(0, EVENT_STATUS_PREVIEW).map((event) => (
                                        <Text key={`rejected-${event.id}`} style={styles.debugMeta}>
                                            {formatEventLabel(event)}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.debugMeta}>No rejected events found.</Text>
                                )}
                            </View>
                            <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
                                <Text style={styles.debugMeta}>Excluded sources (first {SOURCE_STATUS_PREVIEW}):</Text>
                                {sourceStatusSummary.excludedSources.length ? (
                                    sourceStatusSummary.excludedSources.slice(0, SOURCE_STATUS_PREVIEW).map((source) => (
                                        <Text key={`excluded-${source.id ?? source.identifier}`} style={styles.debugMeta}>
                                            {formatSourceLabel(source)}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.debugMeta}>No excluded sources found.</Text>
                                )}
                            </View>
                            <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
                                <Text style={styles.debugMeta}>Rejected sources (first {SOURCE_STATUS_PREVIEW}):</Text>
                                {sourceStatusSummary.rejectedSources.length ? (
                                    sourceStatusSummary.rejectedSources.slice(0, SOURCE_STATUS_PREVIEW).map((source) => (
                                        <Text key={`rejected-source-${source.id ?? source.identifier}`} style={styles.debugMeta}>
                                            {formatSourceLabel(source)}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.debugMeta}>No rejected sources found.</Text>
                                )}
                            </View>
                        </AccordionSection>
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
                                onPress={onPressDiscoverGameNotificationPrompt}
                            >
                                <Text style={styles.secondaryButtonText}>Prompt Discover Game notifications</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={onPressResetDiscoverGameNotifications}
                            >
                                <Text style={styles.secondaryButtonText}>Reset Discover Game notifications</Text>
                            </TouchableOpacity>
                            {__DEV__ && (
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={onPressResetNotificationPermissions}
                                >
                                    <Text style={styles.secondaryButtonText}>Reset notification permissions</Text>
                                </TouchableOpacity>
                            )}
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
                            title="Recommendations"
                            subtitle="Calendar picks vs followed organizers"
                            expanded={recommendationsExpanded}
                            onToggle={() => setRecommendationsExpanded((prev) => !prev)}
                        >
                            <Text style={styles.debugMeta}>
                                My Calendar (wishlist) pool: {recommendationResult.debug.calendar.poolCount} • promo{' '}
                                {recommendationResult.debug.calendar.promoPoolCount}
                            </Text>
                            <Text style={styles.debugMeta}>
                                My Calendar promo required:{' '}
                                {recommendationResult.debug.calendar.promoRequired ? 'yes' : 'no'} • satisfied:{' '}
                                {recommendationResult.debug.calendar.promoSatisfied ? 'yes' : 'no'}
                            </Text>
                            <Text style={styles.debugMeta}>
                                Organizer pool: {recommendationResult.debug.organizers.poolCount} • promo{' '}
                                {recommendationResult.debug.organizers.promoPoolCount}
                            </Text>
                            <Text style={styles.debugMeta}>
                                Organizer promo required:{' '}
                                {recommendationResult.debug.organizers.promoRequired ? 'yes' : 'no'} • satisfied:{' '}
                                {recommendationResult.debug.organizers.promoSatisfied ? 'yes' : 'no'}
                            </Text>
                            <Text style={styles.debugMeta}>
                                Dedupe excluded ids:{' '}
                                {recommendationResult.debug.dedupe.excludedIds.length
                                    ? recommendationResult.debug.dedupe.excludedIds.join(', ')
                                    : 'none'}
                            </Text>
                            <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
                                <Text style={styles.debugMeta}>My Calendar (wishlist) picks:</Text>
                                {recommendationResult.debug.calendar.picks.length ? (
                                    recommendationResult.debug.calendar.picks.map((pick) => (
                                        <Text key={`rec-calendar-${pick.event.id}`} style={styles.debugMeta}>
                                            {formatRecommendationPick(pick)}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.debugMeta}>No calendar picks.</Text>
                                )}
                            </View>
                            <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
                                <Text style={styles.debugMeta}>Organizer picks:</Text>
                                {recommendationResult.debug.organizers.picks.length ? (
                                    recommendationResult.debug.organizers.picks.map((pick) => (
                                        <Text key={`rec-org-${pick.event.id}`} style={styles.debugMeta}>
                                            {formatRecommendationPick(pick)}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.debugMeta}>No organizer picks.</Text>
                                )}
                            </View>
                            <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
                                <Text style={styles.debugMeta}>Final order (promo first):</Text>
                                {recommendationResult.debug.final.picks.length ? (
                                    recommendationResult.debug.final.picks.map((pick, index) => (
                                        <Text key={`rec-final-${pick.event.id}-${index}`} style={styles.debugMeta}>
                                            {index + 1}. {formatRecommendationPick(pick)}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.debugMeta}>No recommendations selected.</Text>
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
                                <TouchableOpacity style={styles.secondaryButton} onPress={onPressClearCalendarAddToast}>
                                    <Text style={styles.secondaryButtonText}>Clear calendar add toast</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => showGuestSaveModal()}
                                >
                                    <Text style={styles.secondaryButtonText}>Show guest save modal</Text>
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
                                    <TouchableOpacity
                                        style={styles.popupShowButton}
                                        onPress={handleShowNextPopup}
                                    >
                                        <Text style={styles.popupShowButtonText}>Show now</Text>
                                    </TouchableOpacity>
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
                                <Text style={styles.popupQueueHeader}>Special Message Popups</Text>
                                {manualPopupsLoading && (
                                    <Text style={styles.debugMeta}>Loading message popups...</Text>
                                )}
                                {!!manualPopupsError && (
                                    <Text style={styles.debugMeta}>
                                        Message popups unavailable (admin access required).
                                    </Text>
                                )}
                                {!manualPopupsLoading && !manualPopupsError && manualPopupItems.length === 0 && (
                                    <Text style={styles.debugMeta}>No message popups scheduled.</Text>
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
                                                            {popup.hasEvent ? `Event · ${popup.eventName}` : 'Message only'}
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
                <EventPopupModal
                    visible={!!debugEventPopup}
                    popup={debugEventPopup}
                    onDismiss={dismissDebugEventPopup}
                    onPrimaryAction={dismissDebugEventPopup}
                />
                <EventListViewIntroModal
                    visible={debugPopupId === 'list_view_intro'}
                    onSwitchToClassic={() => handleDebugListViewChoice('classic')}
                    onKeepNew={() => handleDebugListViewChoice('image')}
                />
                <EdgePlayGroupModal
                    visible={debugPopupId === 'whatsapp_group'}
                    onDismiss={dismissDebugPopup}
                    onSnooze={dismissDebugPopup}
                />
                <RateAppModal
                    visible={debugPopupId === 'rate_app'}
                    onDismiss={dismissDebugPopup}
                    onSnooze={dismissDebugPopup}
                />
                <DiscoverGameModal
                    visible={debugPopupId === 'discover_game'}
                    onDismiss={dismissDebugPopup}
                    onSnooze={dismissDebugPopup}
                />
                <NewsletterSignupModal
                    visible={debugPopupId === 'newsletter_signup'}
                    onDismiss={dismissDebugPopup}
                    onSnooze={dismissDebugPopup}
                />
                <ShareCalendarModal
                    visible={debugPopupId === 'share_calendar'}
                    onDismiss={dismissDebugPopup}
                    onSnooze={dismissDebugPopup}
                />
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
    const hasEvent = !!(popup.event || popup.event_id);
    const eventName = popup.event?.name || (popup.event_id ? `Event #${popup.event_id}` : 'No event');
    const status = getManualPopupStatus(publishedAt, expiresAt, eventEndsAt, now);
    const createdAfterInstall = !!(installAt && createdAt && createdAt > installAt);
    const dismissed = localState?.dismissed;
    const seenAt = localState?.seenAt;
    const hasSeen = !!seenAt || !!dismissed;

    return {
        id: popup.id,
        title: popup.title,
        eventName,
        hasEvent,
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
