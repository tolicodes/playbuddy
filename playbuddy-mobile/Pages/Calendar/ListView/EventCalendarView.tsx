import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Image,
    View,
    StyleSheet,
    SectionList,
    Linking,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    ScrollView,
    useWindowDimensions,
} from "react-native";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment-timezone";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useFetchEvents } from "../../../Common/db-axios/useEvents";
import { useFetchFollows } from "../../../Common/db-axios/useFollows";
import { useCommonContext } from "../../../Common/hooks/CommonContext";
import { getAvailableOrganizers } from "../hooks/calendarUtils";
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from "../hooks/eventHelpers";
import { useCalendarData } from "../hooks/useCalendarData";
import {
    buildRecommendations,
    RECOMMENDATION_WINDOW_END_DAYS,
    RECOMMENDATION_WINDOW_START_DAYS,
} from "../hooks/recommendations";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { FiltersView, FilterState } from "./Filters/FiltersView";
import EventList, { EVENT_SECTION_HEADER_HEIGHT } from "./EventList";
import { ITEM_HEIGHT } from "./EventListItem";
import { CLASSIC_ITEM_HEIGHT } from "./EventListItemClassic";
import { logEvent } from "../../../Common/hooks/logger";
import { ADMIN_EMAILS, MISC_URLS } from "../../../config";
import { EventWithMetadata, NavStack } from "../../../Common/Nav/NavStackType";
import { PopupManager, useCalendarCoach } from "../../PopupManager";
import { TopBar, ChipTone, QuickFilterItem, TypeaheadSuggestion, ActiveFilterChip } from "./TopBar";
import { WeekStrip } from "./WeekStrip";
import { SECTION_DATE_FORMAT } from "../hooks/useGroupedEventsMain";
import { formatDate } from "../hooks/calendarUtils";
import { getAllClassificationsFromEvents } from "../../../utils/getAllClassificationsFromEvents";
import { UE } from "../../../userEventTypes";
import { useEventAnalyticsProps } from "../../../Common/hooks/useAnalytics";
import { navigateToHomeStackScreen, navigateToTab } from "../../../Common/Nav/navigationHelpers";
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from "../../../Common/types/commonTypes";
import {
    calendarExperienceTone,
    calendarInteractivityTones,
    calendarOrganizerTone,
    calendarTypeChips,
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from "../../../components/styles";

import {
    TZ,
    NavState,
    ny,
    hasEventsOnDayNY,
    findEventDayFrom,
    computeInitialState,
    deriveWeekArrays,
} from "./calendarNavUtils";
import { FullCalendar } from "./FullCalendar";
import {
    EventListViewMode,
    getEventListViewMode,
    setEventListViewMode as setStoredEventListViewMode,
} from "./eventListViewMode";

interface Props {
    events?: EventWithMetadata[];
    showGoogleCalendar?: boolean;
    entity?: string;
    featuredEvents?: EventWithMetadata[];
    entityId?: string;
    headerContent?: React.ReactNode;
    scrollToTodayToken?: number | null;
    scrollToTodayOffset?: number;
}

const DATE_COACH_COUNT_KEY = "dateCoachShownCount";
const DATE_COACH_LAST_SHOWN_KEY = "dateCoachLastShownAt";
const DATE_COACH_MAX_SHOWS = 3;
const DATE_COACH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const COMMUNITY_BANNER_HIDDEN_KEY = "communityBannerHidden";
const RECOMMENDATIONS_HIDDEN_KEY = "organizerRecommendationsHidden";
const EMPTY_EVENTS: EventWithMetadata[] = [];
const DATE_TOAST_GRADIENT = [
    "rgba(107, 87, 208, 0.8)",
    "rgba(75, 42, 191, 0.8)",
    "rgba(255, 38, 117, 0.8)",
] as const;
const DATE_TOAST_BACKGROUND = "rgba(75, 42, 191, 0.8)";
const CALENDAR_COACH_SCROLL_OFFSET_PX = 200;
const CALENDAR_COACH_BORDER_COLOR = 'transparent';
const CALENDAR_COACH_SCREEN_SCRIM = "rgba(64, 64, 64, 0.8)";
const EXTRA_SCROLL_DELAY_MS = 180;
const SMOOTH_SCROLL_DURATION_MS = 320;

const CalendarCoachScreenScrim = () => {
    const calendarCoach = useCalendarCoach();
    if (!calendarCoach?.showOverlay) return null;
    return <View pointerEvents="none" style={styles.calendarCoachScreenScrim} />;
};

const EventCalendarView: React.FC<Props> = ({
    events,
    showGoogleCalendar = false,
    featuredEvents,
    entity = "events",
    entityId,
    headerContent,
    scrollToTodayToken = null,
    scrollToTodayOffset = 0,
}) => {
    type DateCoachMeta = { count: number; lastShownAt: number | null };
    const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
    const [showDateToast, setShowDateToast] = useState(false);
    const [dateCoachMeta, setDateCoachMeta] = useState<DateCoachMeta | null>(null);
    const [communityBannerHidden, setCommunityBannerHidden] = useState(false);
    const [recommendationsHidden, setRecommendationsHidden] = useState<boolean | null>(null);
    const [listHeaderHeight, setListHeaderHeight] = useState(0);
    const [recommendationsLaneWidth, setRecommendationsLaneWidth] = useState(0);
    const pendingScrollDateRef = useRef<{ date: Date; extraOffset: number } | null>(null);
    const lastScrollDateRef = useRef<Date | null>(null);
    const lastScrollOffsetRef = useRef(0);
    const lastScrollHeaderHeightRef = useRef<number | null>(null);
    const listScrollSyncRef = useRef({
        isProgrammatic: false,
        targetDateKey: null as string | null,
        lastSyncedDateKey: null as string | null,
    });
    const navUpdateSourceRef = useRef<'list' | 'other'>('other');
    const weekStripAnimationDirectionRef = useRef<"prev" | "next" | null>(null);
    const pendingCoachRef = useRef(false);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;
    const monthModalAnim = useRef(new Animated.Value(0)).current;
    const listScrollOffsetRef = useRef(0);
    const smoothScrollValueRef = useRef(new Animated.Value(0));
    const smoothScrollAnimRef = useRef<Animated.CompositeAnimation | null>(null);
    const smoothScrollListenerRef = useRef<string | null>(null);
    const extraScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingScrollRetryRef = useRef(0);
    const calendarCoachScrollRef = useRef(false);
    const { authUserId, userProfile, currentDeepLink } = useUserContext();
    const navigation = useNavigation<NavStack>();
    const { myCommunities } = useCommonContext();
    const {
        allEvents: calendarEvents,
        organizers: calendarOrganizers,
        isLoadingEvents: isCalendarLoadingEvents,
        isUsingCachedFallback: isCalendarCachedFallback,
        wishlistEvents,
        wishlistEntryMap,
        isOnWishlist,
        toggleWishlistEvent,
        isEventSourceExcluded,
    } = useCalendarData();
    const calendarCoach = useCalendarCoach();
    const showCoachOverlay = calendarCoach?.showOverlay ?? false;
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const approvalStatuses = useMemo(
        () => (isAdmin ? ['approved', 'pending', 'rejected'] : undefined),
        [isAdmin]
    );
    const isMainEventsView = !events && entity === "events";
    const {
        data: fetchedEventsData,
        isLoading: isLoadingEvents,
        isUsingCachedFallback: isFetchedCachedFallback,
    } = useFetchEvents({
        approvalStatuses,
        includePrivate: !!authUserId,
    });
    const fetchedEvents = fetchedEventsData ?? EMPTY_EVENTS;
    const { data: follows } = useFetchFollows(authUserId);
    const resolvedOrganizers = useMemo(
        () => (isMainEventsView ? calendarOrganizers : getAvailableOrganizers(fetchedEvents)),
        [calendarOrganizers, fetchedEvents, isMainEventsView]
    );
    const organizerColorMap = useMemo(() => mapOrganizerColors(resolvedOrganizers as any), [resolvedOrganizers]);
    const eventsWithMetadata = useMemo(
        () => (isMainEventsView ? calendarEvents : addEventMetadata({ events: fetchedEvents, organizerColorMap })),
        [calendarEvents, fetchedEvents, organizerColorMap, isMainEventsView]
    );
    const sourceEvents = useMemo(
        () => (events ? addEventMetadata({ events, organizerColorMap }) : eventsWithMetadata),
        [events, eventsWithMetadata, organizerColorMap]
    );
    const isLoadingList = events
        ? false
        : isMainEventsView
            ? isCalendarLoadingEvents && calendarEvents.length === 0
            : isLoadingEvents;
    const isOfflineFallbackActive = isMainEventsView ? isCalendarCachedFallback : isFetchedCachedFallback;
    const handleToggleWishlist = useCallback(
        (eventId: number, isOnWishlistValue: boolean) => {
            toggleWishlistEvent.mutate({ eventId, isOnWishlist: isOnWishlistValue });
        },
        [toggleWishlistEvent]
    );
    const organizerIdsFromCommunities = useMemo(() => {
        const organizerIds = myCommunities.allMyCommunities
            .map((community) => community.organizer_id)
            .filter(Boolean)
            .map((id) => id.toString());
        return Array.from(new Set(organizerIds));
    }, [myCommunities.allMyCommunities]);
    const followedOrganizerIds = useMemo(() => {
        const followIds = (follows?.organizer || []).map((id) => id.toString());
        return new Set([...followIds, ...organizerIdsFromCommunities]);
    }, [follows?.organizer, organizerIdsFromCommunities]);
    const hasFollowedOrganizers = followedOrganizerIds.size > 0;
    const { width: windowWidth } = useWindowDimensions();
    const recommendationCardWidth = useMemo(() => {
        const baseWidth =
            recommendationsLaneWidth > 0
                ? recommendationsLaneWidth
                : Math.max(0, windowWidth - spacing.lg * 2 - spacing.md * 2);
        return Math.round(baseWidth * 0.4);
    }, [recommendationsLaneWidth, windowWidth]);
    const getPromoCodesForEvent = (event: EventWithMetadata) => {
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
    };
    const isFocused = useIsFocused();
    const [listViewMode, setListViewMode] = useState<EventListViewMode>('image');

    const [searchQuery, setSearchQuery] = useState("");
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        tags: [],
        event_types: [],
        experience_levels: [],
        interactivity_levels: [],
    });
    type QuickFilterCategory = 'munches' | 'play_parties' | 'rope';
    type QuickFilterSelection =
        | { type: 'category'; key: QuickFilterCategory }
        | { type: 'tag'; tag: string }
        | { type: 'organizer'; organizer: string }
        | { type: 'event_type'; eventType: string }
        | { type: 'experience'; level: string }
        | { type: 'interactivity'; level: string };

    const [quickFilter, setQuickFilter] = useState<QuickFilterSelection | null>(null);
    const [typeaheadSelection, setTypeaheadSelection] = useState<TypeaheadSuggestion | null>(null);

    useEffect(() => {
        let isActive = true;
        AsyncStorage.multiGet([DATE_COACH_COUNT_KEY, DATE_COACH_LAST_SHOWN_KEY]).then(
            (entries) => {
                if (!isActive) return;
                const countValue = entries.find(([key]) => key === DATE_COACH_COUNT_KEY)?.[1];
                const lastValue = entries.find(([key]) => key === DATE_COACH_LAST_SHOWN_KEY)?.[1];
                const parsedCount = countValue ? parseInt(countValue, 10) : 0;
                const count = Number.isNaN(parsedCount) ? 0 : parsedCount;
                const parsedLast = lastValue ? Number(lastValue) : Number.NaN;
                const lastShownAt = Number.isNaN(parsedLast) ? null : parsedLast;
                const meta = { count, lastShownAt };
                setDateCoachMeta(meta);
                if (pendingCoachRef.current) {
                    pendingCoachRef.current = false;
                    if (shouldShowDateToast(meta)) {
                        showDateToastNow(meta);
                    }
                }
            }
        );
        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!isMainEventsView) return;
        let isActive = true;
        AsyncStorage.multiGet([COMMUNITY_BANNER_HIDDEN_KEY, RECOMMENDATIONS_HIDDEN_KEY]).then((entries) => {
            if (!isActive) return;
            const entryMap = new Map(entries);
            setCommunityBannerHidden(entryMap.get(COMMUNITY_BANNER_HIDDEN_KEY) === "true");
            setRecommendationsHidden(entryMap.get(RECOMMENDATIONS_HIDDEN_KEY) === "true");
        });
        return () => {
            isActive = false;
        };
    }, [isMainEventsView]);

    useEffect(() => {
        let isActive = true;
        if (!isFocused) {
            return () => {
                isActive = false;
            };
        }
        getEventListViewMode().then((mode) => {
            if (isActive) {
                setListViewMode(mode);
            }
        });
        return () => {
            isActive = false;
        };
    }, [isFocused]);


    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (showDateToast) {
            toastAnim.setValue(0);
            Animated.spring(toastAnim, {
                toValue: 1,
                friction: 7,
                tension: 120,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }).start();
        }
    }, [showDateToast, toastAnim]);

    useEffect(() => {
        if (!isMonthModalOpen) return;
        monthModalAnim.setValue(0);
        Animated.spring(monthModalAnim, {
            toValue: 1,
            friction: 8,
            tension: 120,
            useNativeDriver: true,
        }).start();
    }, [isMonthModalOpen, monthModalAnim]);

    const allClassifications = useMemo(() => {
        if (!sourceEvents)
            return { tags: [], experience_levels: [], interactivity_levels: [], event_types: [] };
        return getAllClassificationsFromEvents(sourceEvents);
    }, [sourceEvents]);

    const analyticsProps = useEventAnalyticsProps();
    const analyticsPropsPlusEntity = { ...analyticsProps, entity, entityId };

    const monthModalWidth = Math.max(0, windowWidth - spacing.lg * 2);
    const monthModalTranslateY = monthModalAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });
    const monthModalScale = monthModalAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
    });

    const sectionListRef = useRef<SectionList>(null);
    const route = useRoute();
    const routeParams = route.params as { scrollToTop?: number; offlineMode?: boolean } | undefined;
    const scrollToTopToken = routeParams?.scrollToTop;
    const isOfflineMode = routeParams?.offlineMode === true;
    const shouldShowOfflineHeader = isMainEventsView && (isOfflineMode || isOfflineFallbackActive);
    const didFilterScrollRef = useRef(false);

    const scrollListToOffset = useCallback((offset: number, animated = true) => {
        const list = sectionListRef.current;
        if (!list) return false;
        if (typeof list.scrollToOffset === "function") {
            list.scrollToOffset({ offset, animated });
            return true;
        }
        const responder = (list as { getScrollResponder?: () => { scrollTo?: (options: { y: number; animated: boolean }) => void } })
            .getScrollResponder?.();
        if (typeof responder?.scrollTo === "function") {
            responder.scrollTo({ y: offset, animated });
            return true;
        }
        const fallback = list as { scrollTo?: (options: { y: number; animated: boolean }) => void };
        if (typeof fallback.scrollTo === "function") {
            fallback.scrollTo({ y: offset, animated });
            return true;
        }
        return false;
    }, []);

    const stopSmoothScroll = useCallback(() => {
        if (smoothScrollAnimRef.current) {
            smoothScrollAnimRef.current.stop();
            smoothScrollAnimRef.current = null;
        }
        const value = smoothScrollValueRef.current;
        if (smoothScrollListenerRef.current) {
            value.removeListener(smoothScrollListenerRef.current);
            smoothScrollListenerRef.current = null;
        }
        value.stopAnimation();
    }, []);

    const smoothScrollToOffset = useCallback(
        (targetOffset: number, durationMs = SMOOTH_SCROLL_DURATION_MS) => {
            if (!sectionListRef.current) return false;
            stopSmoothScroll();
            const startOffset = listScrollOffsetRef.current;
            const delta = targetOffset - startOffset;
            if (Math.abs(delta) < 1) {
                scrollListToOffset(targetOffset, false);
                return true;
            }
            const value = smoothScrollValueRef.current;
            value.setValue(0);
            smoothScrollListenerRef.current = value.addListener(({ value: progress }) => {
                scrollListToOffset(startOffset + delta * progress, false);
            });
            smoothScrollAnimRef.current = Animated.timing(value, {
                toValue: 1,
                duration: durationMs,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            });
            smoothScrollAnimRef.current.start(() => {
                if (smoothScrollListenerRef.current) {
                    value.removeListener(smoothScrollListenerRef.current);
                    smoothScrollListenerRef.current = null;
                }
                smoothScrollAnimRef.current = null;
            });
            return true;
        },
        [scrollListToOffset, stopSmoothScroll]
    );

    const handleCalendarCoachIntro = useCallback(() => {
        if (calendarCoachScrollRef.current) return;
        calendarCoachScrollRef.current = true;
        goToToday(CALENDAR_COACH_SCROLL_OFFSET_PX);
    }, [goToToday]);

    useEffect(() => {
        return () => {
            stopSmoothScroll();
            if (extraScrollTimeoutRef.current) {
                clearTimeout(extraScrollTimeoutRef.current);
            }
            if (pendingScrollTimeoutRef.current) {
                clearTimeout(pendingScrollTimeoutRef.current);
            }
        };
    }, [stopSmoothScroll]);

    useEffect(() => {
        if (!scrollToTopToken) return;
        requestAnimationFrame(() => {
            scrollListToOffset(0);
        });
    }, [scrollToTopToken]);

    useEffect(() => {
        if (!sectionListRef.current) return;
        if (!didFilterScrollRef.current) {
            didFilterScrollRef.current = true;
            return;
        }
        scrollListToOffset(0);
    }, [filters, quickFilter, searchQuery]);

    const handleListViewModeChange = (mode: EventListViewMode) => {
        setListViewMode(mode);
        void setStoredEventListViewMode(mode);
    };


    const eventHasTag = (event: EventWithMetadata, tag: string) => {
        const target = tag.toLowerCase();
        const combinedTags = [...(event.tags || []), ...(event.classification?.tags || [])];
        return combinedTags.some((t) => t.toLowerCase().includes(target));
    };

    const normalizeSearchText = (value?: string) =>
        value ? value.toLowerCase().replace(/[_-]+/g, " ").trim() : "";
    const formatDayKey = (day: Date) => moment(day).tz(TZ).format("YYYY-MM-DD");

    const isActiveEventType = (value?: string | null) =>
        !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);

    const resolveEventTypeValue = (event: EventWithMetadata) => {
        if (event.play_party || event.type === 'play_party') return 'play_party';
        if (event.is_munch || event.type === 'munch') return 'munch';
        if (isActiveEventType(event.type)) return event.type;
        return FALLBACK_EVENT_TYPE;
    };

    const formatLabel = (value: string) =>
        value
            .replace(/[_-]+/g, " ")
            .split(" ")
            .filter(Boolean)
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(" ");

    const normalizeValue = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "_").trim();

    const buildLabelGroups = (
        values: string[],
        labelFn: (value: string) => string
    ) => {
        const grouped = new Map<string, { label: string; values: string[] }>();
        values.forEach((value) => {
            const label = labelFn(value).trim();
            if (!label) return;
            const key = label.toLowerCase();
            const entry = grouped.get(key) || { label, values: [] };
            entry.values.push(value);
            grouped.set(key, entry);
        });
        return Array.from(grouped.values());
    };

    const matchesQuickFilter = (event: EventWithMetadata) => {
        if (!quickFilter) return true;
        if (quickFilter.type === 'category') {
            if (quickFilter.key === 'munches') return event.is_munch === true;
            if (quickFilter.key === 'play_parties') return event.play_party === true;
            if (quickFilter.key === 'rope') {
                const tagMatches = eventHasTag(event, 'rope');
                const nameMatches = event.name?.toLowerCase().includes('rope');
                const descMatches = event.description?.toLowerCase().includes('rope');
                const shortMatches = event.short_description?.toLowerCase().includes('rope');
                return Boolean(tagMatches || nameMatches || descMatches || shortMatches);
            }
            return true;
        }
        if (quickFilter.type === 'tag') {
            return eventHasTag(event, quickFilter.tag);
        }
        if (quickFilter.type === 'event_type') {
            const eventType = normalizeValue(quickFilter.eventType);
            return resolveEventTypeValue(event) === eventType;
        }
        if (quickFilter.type === 'experience') {
            const level = normalizeValue(event.classification?.experience_level || '');
            return level === normalizeValue(quickFilter.level);
        }
        if (quickFilter.type === 'interactivity') {
            const level = normalizeValue(event.classification?.interactivity_level || '');
            return level === normalizeValue(quickFilter.level);
        }
        const organizerName = event.organizer?.name?.toLowerCase() || '';
        return organizerName === quickFilter.organizer.toLowerCase();
    };

    const chipTones: Record<string, ChipTone> = calendarTypeChips;
    const organizerTone: ChipTone = calendarOrganizerTone;
    const experienceTone: ChipTone = calendarExperienceTone;
    const interactivityTones: Record<string, ChipTone> = calendarInteractivityTones;
    const toneAliases: Record<string, string> = {
        'play parties': 'play party',
        'munches': 'munch',
    };
    const getToneForLabel = (label: string) => {
        const key = label.trim().toLowerCase();
        const alias = toneAliases[key];
        return chipTones[alias || key];
    };
    const getToneForInteractivity = (label: string) => {
        const key = normalizeValue(label);
        return interactivityTones[key];
    };

    const quickTagChips = useMemo(() => {
        const excluded = new Set(['munch', 'munches', 'play party', 'play parties', 'rope']);
        const tags: string[] = [];

        for (const tag of allClassifications.tags || []) {
            const name = tag.name.trim();
            const key = name.toLowerCase();
            if (!name || excluded.has(key)) continue;
            if (tags.some((t) => t.toLowerCase() === key)) continue;
            tags.push(name);
            if (tags.length >= 12) break;
        }

        return tags;
    }, [allClassifications.tags]);

    const baseQuickFilters = useMemo<QuickFilterItem[]>(
        () => [
            {
                id: 'category:munches',
                label: 'Munches',
                icon: 'tag',
                tone: getToneForLabel('munch'),
            },
            {
                id: 'category:play_parties',
                label: 'Play Parties',
                icon: 'tag',
                tone: getToneForLabel('play party'),
            },
            {
                id: 'category:rope',
                label: 'Rope',
                icon: 'tag',
                tone: getToneForLabel('rope'),
            },
            ...quickTagChips.map((tag) => ({
                id: `tag:${tag}`,
                label: tag,
                icon: 'tag',
                tone: getToneForLabel(tag),
            })),
        ],
        [quickTagChips]
    );

    const filteredEvents = useMemo(() => {
        if (!sourceEvents) return [];
        const normalize = (str?: string) => str?.toLowerCase().replace(/ /g, "_");
        const normalizeExperienceLevel = (value?: string | null) => {
            const normalized = normalize(value || '') || '';
            if (normalized === 'all_levels' || normalized === 'all_level' || normalized === 'all') {
                return 'all';
            }
            return normalized;
        };
        const normalizedExperienceFilters = filters.experience_levels.map(normalizeExperienceLevel);
        const baseEvents = quickFilter ? sourceEvents.filter(matchesQuickFilter) : sourceEvents;

        const normalizedQuery = normalizeSearchText(searchQuery);
        return baseEvents.filter((event) => {
            if (normalizedQuery.length > 0) {
                const fields: Array<string | undefined> = [
                    event.name,
                    event.organizer?.name,
                    event.description,
                    event.short_description,
                    event.type && isActiveEventType(event.type) ? event.type : undefined,
                    event.classification?.experience_level,
                    event.classification?.interactivity_level,
                ];

                if (event.play_party) fields.push('play party');
                if (event.is_munch) fields.push('munch');

                for (const tag of event.tags || []) {
                    fields.push(tag);
                }
                for (const tag of event.classification?.tags || []) {
                    fields.push(tag);
                }

                const matchesQuery = fields.some((field) =>
                    normalizeSearchText(field).includes(normalizedQuery)
                );
                if (!matchesQuery) return false;
            }

            const tags = [...(event.classification?.tags || []), ...(event.tags || [])];
            const matchesTags =
                filters.tags.length === 0 ||
                filters.tags.some((t) => tags.some((tag) => tag.toLowerCase() === t.toLowerCase()));
            const exp = normalizeExperienceLevel(event.classification?.experience_level);
            const matchesExp =
                filters.experience_levels.length === 0 ||
                normalizedExperienceFilters.includes(exp || "");
            const inter = normalize(event.classification?.interactivity_level);
            const matchesInter = filters.interactivity_levels.length === 0 || filters.interactivity_levels.includes(inter || "");
            const resolvedType = resolveEventTypeValue(event);
            const matchesType =
                filters.event_types.length === 0
                || (resolvedType && filters.event_types.includes(resolvedType));
            return matchesTags && matchesExp && matchesInter && matchesType;
        });
    }, [sourceEvents, searchQuery, filters, quickFilter]);

    const recommendationResult = useMemo(() => {
        const hasPromo = (event: EventWithMetadata) => getPromoCodesForEvent(event).length > 0;
        return buildRecommendations({
            sourceEvents: sourceEvents ?? [],
            wishlistEvents,
            wishlistEntryMap,
            followedOrganizerIds,
            tz: TZ,
            hasPromo,
            windowStartDays: RECOMMENDATION_WINDOW_START_DAYS,
            windowEndDays: RECOMMENDATION_WINDOW_END_DAYS,
        });
    }, [
        currentDeepLink,
        followedOrganizerIds,
        sourceEvents,
        wishlistEvents,
        wishlistEntryMap,
    ]);

    const recommendations = isMainEventsView ? recommendationResult.selections : [];

    const selectedQuickFilterId = quickFilter
        ? quickFilter.type === 'category'
            ? `category:${quickFilter.key}`
            : quickFilter.type === 'tag'
                ? `tag:${quickFilter.tag}`
                : quickFilter.type === 'organizer'
                    ? `organizer:${quickFilter.organizer}`
                    : quickFilter.type === 'event_type'
                        ? `event_type:${normalizeValue(quickFilter.eventType)}`
                        : quickFilter.type === 'experience'
                            ? `experience:${normalizeValue(quickFilter.level)}`
                            : `interactivity:${normalizeValue(quickFilter.level)}`
        : null;

    const typeaheadSuggestions = useMemo<TypeaheadSuggestion[]>(() => {
        const seen = new Set<string>();
        const suggestions: TypeaheadSuggestion[] = [];
        const pushSuggestion = (
            type: TypeaheadSuggestion['type'],
            label: string,
            tone?: ChipTone,
            value?: string
        ) => {
            const normalizedValue = normalizeValue(value || label);
            const dedupeKey = `${type}:${normalizeSearchText(label)}`;
            if (!label || seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            const idValue =
                type === 'tag' || type === 'organizer'
                    ? label
                    : normalizedValue;
            suggestions.push({
                id: `${type}:${idValue}`,
                label,
                type,
                tone,
                value: normalizedValue,
            });
        };

        for (const { name } of allClassifications.event_types || []) {
            if (normalizeValue(name) === 'event') continue;
            const label = formatLabel(name);
            pushSuggestion('event_type', label, getToneForLabel(label), name);
        }

        for (const { name } of allClassifications.experience_levels || []) {
            const label = formatLabel(name);
            pushSuggestion('experience', label, experienceTone, name);
        }

        for (const { name } of allClassifications.interactivity_levels || []) {
            const label = formatLabel(name);
            pushSuggestion('interactivity', label, getToneForInteractivity(name) || experienceTone, name);
        }

        for (const tag of allClassifications.tags || []) {
            const name = tag.name.trim();
            if (!name) continue;
            pushSuggestion('tag', name, getToneForLabel(name));
        }

        for (const event of sourceEvents || []) {
            for (const tag of event.tags || []) {
                const name = tag.trim();
                if (!name) continue;
                pushSuggestion('tag', name, getToneForLabel(name));
            }
            const organizerName = event.organizer?.name?.trim();
            if (organizerName) {
                pushSuggestion('organizer', organizerName, organizerTone);
            }
        }

        return suggestions;
    }, [allClassifications, sourceEvents]);

    const quickFilters = useMemo<QuickFilterItem[]>(() => {
        if (!typeaheadSelection) return baseQuickFilters;
        const icon =
            typeaheadSelection.type === 'organizer'
                ? 'users'
                : typeaheadSelection.type === 'event_type'
                    ? 'calendar-alt'
                    : typeaheadSelection.type === 'experience'
                        ? 'signal'
                        : typeaheadSelection.type === 'interactivity'
                            ? 'hand-paper'
                            : 'tag';
        return [
            {
                id: typeaheadSelection.id,
                label: typeaheadSelection.label,
                icon,
                tone: typeaheadSelection.tone,
            },
        ];
    }, [baseQuickFilters, typeaheadSelection]);

    const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
        const chips: ActiveFilterChip[] = [];
        const chipById = new Set<string>();

        const pushChip = (chip: ActiveFilterChip) => {
            if (chipById.has(chip.id)) return;
            chipById.add(chip.id);
            chips.push(chip);
        };

        const removeFilterValues = (
            key: keyof FilterState,
            values: string[],
            normalizeFn: (value: string) => string
        ) => {
            setFilters((prev) => ({
                ...prev,
                [key]: prev[key].filter(
                    (item) => !values.some((value) => normalizeFn(item) === normalizeFn(value))
                ),
            }));
        };

        const tagGroups = buildLabelGroups(filters.tags, (value) => value.trim());
        tagGroups.forEach(({ label, values }) => {
            pushChip({
                id: `filter:tag:${normalizeSearchText(label)}`,
                label,
                icon: 'tag',
                tone: getToneForLabel(label),
                onRemove: () => removeFilterValues('tags', values, normalizeSearchText),
            });
        });

        const eventTypeGroups = buildLabelGroups(filters.event_types, (value) => formatLabel(value));
        eventTypeGroups.forEach(({ label, values }) => {
            if (label.toLowerCase() === FALLBACK_EVENT_TYPE) return;
            pushChip({
                id: `filter:event_type:${normalizeValue(label)}`,
                label,
                icon: 'calendar-alt',
                tone: getToneForLabel(label),
                onRemove: () => removeFilterValues('event_types', values, normalizeValue),
            });
        });

        const experienceGroups = buildLabelGroups(filters.experience_levels, (value) => formatLabel(value));
        experienceGroups.forEach(({ label, values }) => {
            pushChip({
                id: `filter:experience:${normalizeValue(label)}`,
                label,
                icon: 'signal',
                tone: experienceTone,
                onRemove: () => removeFilterValues('experience_levels', values, normalizeValue),
            });
        });

        const interactivityGroups = buildLabelGroups(filters.interactivity_levels, (value) => formatLabel(value));
        interactivityGroups.forEach(({ label, values }) => {
            pushChip({
                id: `filter:interactivity:${normalizeValue(label)}`,
                label,
                icon: 'hand-paper',
                tone: getToneForInteractivity(label) || experienceTone,
                onRemove: () => removeFilterValues('interactivity_levels', values, normalizeValue),
            });
        });

        if (quickFilter) {
            let label = '';
            let icon: string | undefined = 'tag';
            let tone: ChipTone | undefined;

            if (quickFilter.type === 'category') {
                label =
                    quickFilter.key === 'munches'
                        ? 'Munches'
                        : quickFilter.key === 'play_parties'
                            ? 'Play Parties'
                            : 'Rope';
                tone = getToneForLabel(label);
            } else if (quickFilter.type === 'tag') {
                label = quickFilter.tag;
                tone = getToneForLabel(label);
            } else if (quickFilter.type === 'organizer') {
                label = quickFilter.organizer;
                icon = 'users';
                tone = organizerTone;
            } else if (quickFilter.type === 'event_type') {
                label = formatLabel(quickFilter.eventType);
                icon = 'calendar-alt';
                tone = getToneForLabel(label);
            } else if (quickFilter.type === 'experience') {
                label = formatLabel(quickFilter.level);
                icon = 'signal';
                tone = experienceTone;
            } else if (quickFilter.type === 'interactivity') {
                label = formatLabel(quickFilter.level);
                icon = 'hand-paper';
                tone = getToneForInteractivity(label) || experienceTone;
            }

            if (label) {
                pushChip({
                    id: `quick:${quickFilter.type}:${normalizeSearchText(label)}`,
                    label,
                    icon,
                    tone,
                    onRemove: () => {
                        setQuickFilter(null);
                        setTypeaheadSelection(null);
                    },
                });
            }
        }

        return chips;
    }, [
        filters,
        quickFilter,
        experienceTone,
        setFilters,
        setQuickFilter,
        setTypeaheadSelection,
    ]);
    const hasSheetFilters = Object.values(filters).some((values) => values.length > 0);
    const hasActiveFilters = activeFilterChips.length > 0;

    const { sections } = useGroupedEvents(filteredEvents, featuredEvents);

    // ===== NY-time Navigation State =====
    const initialNav = useMemo(() => computeInitialState(filteredEvents), [filteredEvents]);
    const [nav, setNav] = useState<NavState>(initialNav);
    const [monthAnchorDate, setMonthAnchorDate] = useState<Date>(() =>
        moment(initialNav.weekAnchorDate).startOf("month").toDate()
    );

    // Treat all days before today as disabled/grey.
    const isDaySelectable = (d: Date | string) => !ny.isBeforeToday(d);
    const hasEventsOnDay = (d: Date | string) => hasEventsOnDayNY(filteredEvents, d);
    const resolveEventDay = (day: Date) => {
        if (hasEventsOnDay(day)) {
            return day;
        }
        return findEventDayFrom(filteredEvents, day, 1) ?? day;
    };
    const resolveNextWeekSelection = (weekStart: Date, sameDow: Date) => {
        const weekAnchor = ny.startOfWeek(weekStart).toDate();
        const weekEnd = ny.addDays(weekAnchor, 6).toDate();
        const inWeek =
            findEventDayFrom(filteredEvents, sameDow, 1, { maxDayInclusive: weekEnd }) ??
            findEventDayFrom(filteredEvents, weekAnchor, 1, { maxDayInclusive: weekEnd });
        if (inWeek) {
            return inWeek;
        }
        const afterWeek = ny.addDays(weekEnd, 1).toDate();
        return findEventDayFrom(filteredEvents, afterWeek, 1) ?? sameDow;
    };

    // Re-sanitize selection when filters change
    useEffect(() => {
        const recomputed = computeInitialState(filteredEvents);
        navUpdateSourceRef.current = 'other';
        weekStripAnimationDirectionRef.current = null;
        setNav((prev) => {
            const selectedStillOk = !ny.isBeforeToday(prev.selectedDate);
            if (selectedStillOk) {
                const chosen = resolveEventDay(prev.selectedDate);
                if (!ny.isSameDay(prev.selectedDate, chosen)) {
                    const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
                    return next;
                }
                const correctAnchor = ny.startOfWeek(prev.selectedDate).toDate();
                if (!ny.startOfWeek(prev.weekAnchorDate).isSame(correctAnchor, "day")) {
                    const next = { weekAnchorDate: correctAnchor, selectedDate: prev.selectedDate };
                    return next;
                }
                return prev;
            }
            return recomputed;
        });
        setMonthAnchorDate((prev) => {
            const next = moment(recomputed.weekAnchorDate).startOf("month");
            if (moment(prev).isSame(next, "month")) {
                return prev;
            }
            return next.toDate();
        });
    }, [filteredEvents]);

    const { prevWeekDays, weekDays, nextWeekDays } = useMemo(
        () => deriveWeekArrays(nav.weekAnchorDate),
        [nav.weekAnchorDate]
    );

    function schedulePendingScroll(date: Date, extraOffset: number) {
        pendingScrollDateRef.current = { date, extraOffset };
        if (pendingScrollTimeoutRef.current) return;
        if (pendingScrollRetryRef.current >= 8) return;
        pendingScrollRetryRef.current += 1;
        pendingScrollTimeoutRef.current = setTimeout(() => {
            pendingScrollTimeoutRef.current = null;
            const pending = pendingScrollDateRef.current;
            if (pending) {
                scrollToDate(pending.date, pending.extraOffset);
            }
        }, 160);
    }

    function scrollToDate(date: Date, extraOffset = 0) {
        stopSmoothScroll();
        lastScrollDateRef.current = date;
        lastScrollOffsetRef.current = extraOffset;
        const targetDateKey = formatDayKey(date);
        if (hasListHeader && listHeaderHeight === 0) {
            schedulePendingScroll(date, extraOffset);
            return;
        }
        let targetEntry = sectionOffsetIndex.find((entry) => entry.dateKey === targetDateKey);
        if (!targetEntry) {
            const targetMoment = moment(date).tz(TZ);
            targetEntry = sectionOffsetIndex.find((entry) => {
                if (!entry.date) return false;
                return moment(entry.date).tz(TZ).isSameOrAfter(targetMoment, "day");
            });
        }
        if (!targetEntry) {
            for (let i = sectionOffsetIndex.length - 1; i >= 0; i -= 1) {
                if (sectionOffsetIndex[i].date) {
                    targetEntry = sectionOffsetIndex[i];
                    break;
                }
            }
        }
        if (!targetEntry || !sectionListRef.current) {
            schedulePendingScroll(date, extraOffset);
            return;
        }
        lastScrollHeaderHeightRef.current = hasListHeader ? listHeaderHeight : 0;
        pendingScrollRetryRef.current = 0;
        const syncState = listScrollSyncRef.current;
        syncState.isProgrammatic = true;
        syncState.targetDateKey = targetEntry.dateKey ?? targetDateKey;
        syncState.lastSyncedDateKey = targetEntry.dateKey ?? targetDateKey;
        const baseOffset = Math.max(0, targetEntry.start);
        scrollListToOffset(baseOffset);
        if (extraOffset) {
            const finalOffset = Math.max(0, targetEntry.start + extraOffset);
            if (finalOffset !== baseOffset) {
                if (extraScrollTimeoutRef.current) {
                    clearTimeout(extraScrollTimeoutRef.current);
                }
                extraScrollTimeoutRef.current = setTimeout(() => {
                    extraScrollTimeoutRef.current = null;
                    smoothScrollToOffset(finalOffset);
                }, EXTRA_SCROLL_DELAY_MS);
            }
        }
    }

    const shouldShowDateToast = (meta: DateCoachMeta) => {
        if (meta.count >= DATE_COACH_MAX_SHOWS) return false;
        if (!meta.lastShownAt) return true;
        return Date.now() - meta.lastShownAt >= DATE_COACH_INTERVAL_MS;
    };

    const showDateToastNow = (currentMeta?: DateCoachMeta) => {
        const now = Date.now();
        setShowDateToast(true);
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => setShowDateToast(false), 7800);
        setDateCoachMeta((prev) => {
            const base = currentMeta ?? prev ?? { count: 0, lastShownAt: null };
            const next = { count: Math.min(base.count + 1, DATE_COACH_MAX_SHOWS), lastShownAt: now };
            void AsyncStorage.multiSet([
                [DATE_COACH_COUNT_KEY, String(next.count)],
                [DATE_COACH_LAST_SHOWN_KEY, String(now)],
            ]);
            return next;
        });
    };

    const triggerDateToast = () => {
        if (!dateCoachMeta) {
            pendingCoachRef.current = true;
            return;
        }
        if (shouldShowDateToast(dateCoachMeta)) {
            showDateToastNow(dateCoachMeta);
        }
    };

    const markNavUpdateFromUser = () => {
        navUpdateSourceRef.current = 'other';
        weekStripAnimationDirectionRef.current = null;
    };

    const onSelectDay = (day: Date) => {
        if (!isDaySelectable(day)) {
            return;
        }
        const chosen = resolveEventDay(day);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };

        markNavUpdateFromUser();
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
    };

    const goToPrevDay = () => {
        const prevDay = ny.addDays(nav.selectedDate, -1).toDate();
        if (!isDaySelectable(prevDay)) return;
        const chosen = resolveEventDay(prevDay);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
        markNavUpdateFromUser();
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
    };

    const goToNextDay = () => {
        const nextDay = ny.addDays(nav.selectedDate, 1).toDate();
        if (!isDaySelectable(nextDay)) return;
        const chosen = resolveEventDay(nextDay);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
        markNavUpdateFromUser();
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
    };

    const shiftWeek = (direction: 1 | -1) => {
        const nextWeekAnchor = ny.addWeeks(nav.weekAnchorDate, direction).toDate();
        const selectedDow = moment(nav.selectedDate).tz(TZ).day();
        const nextSelected = ny.addDays(nextWeekAnchor, selectedDow).toDate();
        const chosen =
            direction === 1
                ? resolveNextWeekSelection(nextWeekAnchor, nextSelected)
                : nextSelected;
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
        markNavUpdateFromUser();
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
    };

    const goToPrevWeek = () => {
        shiftWeek(-1);
    };

    const goToNextWeek = () => {
        shiftWeek(1);
    };

    function goToToday(extraOffset = 0) {
        const today = moment().tz(TZ).toDate();
        if (!isDaySelectable(today)) return;
        const chosen = resolveEventDay(today);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
        markNavUpdateFromUser();
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen, extraOffset);
    }

    useEffect(() => {
        if (!scrollToTodayToken) return;
        goToToday(scrollToTodayOffset);
        const retry = setTimeout(() => {
            goToToday(scrollToTodayOffset);
        }, 420);
        return () => clearTimeout(retry);
    }, [scrollToTodayOffset, scrollToTodayToken]);

    const openMonthModal = (day?: Date) => {
        const anchor = day ?? nav.selectedDate;
        setMonthAnchorDate(moment(anchor).startOf("month").toDate());
        if (!isMonthModalOpen) {
            logEvent(UE.DateBarCalendarPressed, { ...analyticsPropsPlusEntity, expanded: true });
            logEvent(UE.CalendarMonthModalShown, {
                ...analyticsPropsPlusEntity,
                day: formatDayKey(anchor),
            });
        }
        setIsMonthModalOpen(true);
    };
    const closeMonthModal = (reason: "dismiss" | "select" = "dismiss") => {
        if (reason === "dismiss" && isMonthModalOpen) {
            logEvent(UE.CalendarMonthModalDismissed, analyticsPropsPlusEntity);
        }
        Animated.timing(monthModalAnim, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setIsMonthModalOpen(false);
            }
        });
    };

    const goToPrevMonth = () =>
        setMonthAnchorDate((prev) => moment(prev).subtract(1, "month").startOf("month").toDate());
    const goToNextMonth = () =>
        setMonthAnchorDate((prev) => moment(prev).add(1, "month").startOf("month").toDate());
    const onMonthChange = (date: Date) =>
        setMonthAnchorDate(moment(date).startOf("month").toDate());

    const monthLabel = useMemo(
        () => moment(monthAnchorDate).tz(TZ).format("MMMM YYYY"),
        [monthAnchorDate]
    );

    const handleStripSelectDay = (day: Date) => {
        onSelectDay(day);
        triggerDateToast();
    };

    const handleStripSwipePrevDay = () => {
        logEvent(UE.DateBarSwipePrev, analyticsPropsPlusEntity);
        goToPrevWeek();
        triggerDateToast();
    };

    const handleStripSwipeNextDay = () => {
        logEvent(UE.DateBarSwipeNext, analyticsPropsPlusEntity);
        goToNextWeek();
        triggerDateToast();
    };

    const handleStripLongPress = (day: Date) => {
        logEvent(UE.DateBarLongPress, { ...analyticsPropsPlusEntity, day: formatDayKey(day) });
        openMonthModal(day);
    };

    const handleMonthModalSelectDay = (day: Date) => {
        logEvent(UE.CalendarMonthModalDaySelected, {
            ...analyticsPropsPlusEntity,
            day: formatDayKey(day),
        });
        onSelectDay(day);
        closeMonthModal("select");
    };

    const handleMonthModalTodayPress = () => {
        const today = moment().tz(TZ).toDate();
        logEvent(UE.DateBarTodayPressed, analyticsPropsPlusEntity);
        handleMonthModalSelectDay(today);
    };

    const handleHideCommunityBanner = () => {
        setCommunityBannerHidden(true);
        void AsyncStorage.setItem(COMMUNITY_BANNER_HIDDEN_KEY, "true");
    };

    const handleFollowOrganizersPress = () => {
        navigateToTab(navigation, "Organizers", { screen: "Follow Organizers" });
    };

    const handleHideRecommendations = () => {
        setRecommendationsHidden(true);
        void AsyncStorage.setItem(RECOMMENDATIONS_HIDDEN_KEY, "true");
    };

    const handleShowRecommendations = () => {
        setRecommendationsHidden(false);
        void AsyncStorage.setItem(RECOMMENDATIONS_HIDDEN_KEY, "false");
    };

    const handleRecommendationPress = (event: EventWithMetadata) => {
        navigateToHomeStackScreen(navigation, "Event Details", {
            selectedEvent: event,
            title: event.name,
            source: "calendar_recommendation",
        });
    };

    const shouldShowCommunityBanner =
        isMainEventsView && !communityBannerHidden && !hasFollowedOrganizers;
    const hasRecommendationSources = hasFollowedOrganizers || (wishlistEvents || []).length > 0;
    const shouldShowRecommendations =
        isMainEventsView && hasRecommendationSources && recommendationsHidden !== true;
    const shouldShowHiddenRecommendations =
        isMainEventsView && hasRecommendationSources && recommendationsHidden === true && !shouldShowCommunityBanner;
    const shouldShowListHeader =
        shouldShowCommunityBanner || shouldShowRecommendations || shouldShowHiddenRecommendations;
    const hasListHeader = shouldShowListHeader;
    const bannerCtaLabel = "Follow";
    const listHeaderOffset = hasListHeader ? listHeaderHeight : 0;
    const sectionOffsetIndex = useMemo(() => {
        const rowHeight = listViewMode === 'classic' ? CLASSIC_ITEM_HEIGHT : ITEM_HEIGHT;
        let cursor = listHeaderOffset;
        return sections.map((section) => {
            const sectionHeight = EVENT_SECTION_HEADER_HEIGHT + section.data.length * rowHeight;
            const start = cursor;
            const end = cursor + sectionHeight;
            cursor = end;
            const rawDate = (section as { date?: string }).date;
            const isValidDate = !!rawDate && moment(rawDate, "YYYY-MM-DD", true).isValid();
            const date = isValidDate ? moment.tz(rawDate as string, "YYYY-MM-DD", TZ).toDate() : null;
            return { start, end, dateKey: isValidDate ? (rawDate as string) : null, date };
        });
    }, [sections, listViewMode, listHeaderOffset]);

    const handleListScrollBeginDrag = () => {
        const syncState = listScrollSyncRef.current;
        syncState.isProgrammatic = false;
        syncState.targetDateKey = null;
    };

    const handleListScroll = (offsetY: number, layoutHeight: number, contentHeight: number) => {
        listScrollOffsetRef.current = offsetY;
        if (sectionOffsetIndex.length === 0) return;
        if (hasListHeader && listHeaderHeight === 0) return;
        if (offsetY < listHeaderOffset) return;

        const targetOffset = offsetY + 1;
        let lo = 0;
        let hi = sectionOffsetIndex.length - 1;
        let match: (typeof sectionOffsetIndex)[number] | null = null;

        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            const entry = sectionOffsetIndex[mid];
            if (targetOffset < entry.start) {
                hi = mid - 1;
            } else if (targetOffset >= entry.end) {
                lo = mid + 1;
            } else {
                match = entry;
                break;
            }
        }

        const atBottom =
            layoutHeight > 0 &&
            contentHeight > 0 &&
            offsetY + layoutHeight >= contentHeight - 1;
        if (atBottom) {
            for (let i = sectionOffsetIndex.length - 1; i >= 0; i -= 1) {
                const entry = sectionOffsetIndex[i];
                if (entry.dateKey && entry.date) {
                    match = entry;
                    break;
                }
            }
        }

        if (!match?.dateKey || !match.date) return;

        const syncState = listScrollSyncRef.current;
        if (syncState.isProgrammatic) {
            if (syncState.targetDateKey && syncState.targetDateKey !== match.dateKey) {
                return;
            }
            syncState.isProgrammatic = false;
            syncState.targetDateKey = null;
        }
        if (syncState.lastSyncedDateKey === match.dateKey) {
            return;
        }
        syncState.lastSyncedDateKey = match.dateKey;

        if (ny.isSameDay(nav.selectedDate, match.date)) {
            return;
        }

        const nextWeekAnchor = ny.startOfWeek(match.date).toDate();
        let direction: "prev" | "next" | null = null;
        if (moment(nextWeekAnchor).tz(TZ).isAfter(moment(nav.weekAnchorDate).tz(TZ), "day")) {
            direction = "next";
        } else if (moment(nextWeekAnchor).tz(TZ).isBefore(moment(nav.weekAnchorDate).tz(TZ), "day")) {
            direction = "prev";
        }

        navUpdateSourceRef.current = 'list';
        weekStripAnimationDirectionRef.current = direction;
        setNav({ weekAnchorDate: nextWeekAnchor, selectedDate: match.date });
        setMonthAnchorDate((prev) => {
            const next = moment(match.date).startOf("month");
            if (moment(prev).isSame(next, "month")) {
                return prev;
            }
            return next.toDate();
        });
    };

    const handleListReady = () => {
        if (!pendingScrollDateRef.current) return;
        if (pendingScrollTimeoutRef.current) {
            clearTimeout(pendingScrollTimeoutRef.current);
            pendingScrollTimeoutRef.current = null;
        }
        const target = pendingScrollDateRef.current;
        pendingScrollDateRef.current = null;
        requestAnimationFrame(() => scrollToDate(target.date, target.extraOffset));
    };

    useEffect(() => {
        if (!__DEV__ || !isMainEventsView) return;
        console.log("[recommendations] state", {
            hasFollowedOrganizers,
            followedOrganizerCount: followedOrganizerIds.size,
            calendarEventCount: (wishlistEvents || []).length,
            recommendationsHidden,
            recommendationsCount: recommendations.length,
        });
    }, [
        hasFollowedOrganizers,
        followedOrganizerIds.size,
        isMainEventsView,
        wishlistEvents,
        recommendations.length,
        recommendationsHidden,
    ]);

    useEffect(() => {
        if (shouldShowListHeader) return;
        setListHeaderHeight(0);
    }, [shouldShowListHeader]);

    useEffect(() => {
        if (!pendingScrollDateRef.current) return;
        if (hasListHeader && listHeaderHeight === 0) return;
        const target = pendingScrollDateRef.current;
        pendingScrollDateRef.current = null;
        requestAnimationFrame(() => scrollToDate(target.date, target.extraOffset));
    }, [hasListHeader, listHeaderHeight, listViewMode, sections]);

    useEffect(() => {
        if (!lastScrollDateRef.current) return;
        if (hasListHeader && listHeaderHeight === 0) {
            pendingScrollDateRef.current = {
                date: lastScrollDateRef.current,
                extraOffset: lastScrollOffsetRef.current,
            };
            return;
        }
        const headerOffset = hasListHeader ? listHeaderHeight : 0;
        if (lastScrollHeaderHeightRef.current === headerOffset) return;
        requestAnimationFrame(() => scrollToDate(lastScrollDateRef.current as Date, lastScrollOffsetRef.current));
    }, [hasListHeader, listHeaderHeight]);

    useEffect(() => {
        if (navUpdateSourceRef.current === 'list') {
            navUpdateSourceRef.current = 'other';
        }
        weekStripAnimationDirectionRef.current = null;
    }, [nav.selectedDate, nav.weekAnchorDate]);

    const toastTranslateY = toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 0],
    });
    const toastScale = toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
    });

    const handleSearchQueryChange = (q: string) => {
        logEvent(UE.FilterSearchTyped, { ...analyticsPropsPlusEntity, search_text: q });
        setSearchQuery(q);
        if (typeaheadSelection && q.trim().length > 0) {
            setTypeaheadSelection(null);
            if (
                quickFilter?.type === 'tag' ||
                quickFilter?.type === 'organizer' ||
                quickFilter?.type === 'event_type' ||
                quickFilter?.type === 'experience' ||
                quickFilter?.type === 'interactivity'
            ) {
                setQuickFilter(null);
            }
        }
    };

    return (
        <View style={styles.screenGradient}>
            <PopupManager
                events={sourceEvents}
                onListViewModeChange={handleListViewModeChange}
                onCalendarCoachIntro={handleCalendarCoachIntro}
            >
                <View style={styles.container}>
                    <FiltersView
                        onApply={(f) => {
                            const previousTags = new Set(filters.tags.map((tag) => normalizeSearchText(tag)));
                            const nextTags = f.tags.filter((tag) => !previousTags.has(normalizeSearchText(tag)));
                            nextTags.forEach((tag) => {
                                logEvent(UE.FilterTagAdded, {
                                    ...analyticsPropsPlusEntity,
                                    tag_name: tag,
                                    tag_count: f.tags.length,
                                });
                            });
                            logEvent(UE.EventCalendarViewFiltersSet, { ...analyticsPropsPlusEntity, filters: f });
                            setFilters(f);
                            setFiltersVisible(false);
                        }}
                        initialFilters={filters}
                        visible={filtersVisible}
                        onClose={() => setFiltersVisible(false)}
                        filterOptions={allClassifications}
                        events={sourceEvents}
                        searchQuery={searchQuery}
                        onSearchQueryChange={handleSearchQueryChange}
                    />

                    {shouldShowOfflineHeader || headerContent ? (
                        <View style={styles.headerSlot}>
                            {shouldShowOfflineHeader ? (
                                <View style={styles.offlineHeaderCard}>
                                    <Text style={styles.offlineHeaderText}>offline mode</Text>
                                </View>
                            ) : null}
                            {headerContent}
                        </View>
                    ) : null}
                    <View style={styles.headerLayer}>
                        <View style={[styles.headerSurface, showCoachOverlay && styles.headerSurfaceCoach]}>
                            <TopBar
                                searchQuery={searchQuery}
                                setSearchQuery={handleSearchQueryChange}
                                onSearchFocus={() => {
                                    logEvent(UE.FilterSearchFocused, analyticsPropsPlusEntity);
                                }}
                                onPressFilters={() => {
                                    if (hasActiveFilters) {
                                        if (hasSheetFilters) {
                                            logEvent(UE.EventCalendarViewFiltersDisabled, analyticsPropsPlusEntity);
                                        }
                                        setFilters({
                                            tags: [],
                                            event_types: [],
                                            experience_levels: [],
                                            interactivity_levels: [],
                                        });
                                        setQuickFilter(null);
                                        setTypeaheadSelection(null);
                                        return;
                                    }
                                    logEvent(UE.EventCalendarViewFiltersEnabled, analyticsPropsPlusEntity);
                                    setFiltersVisible(true);
                                }}
                                onPressGoogleCalendar={() => {
                                    logEvent(UE.EventCalendarViewGoogleCalendar, analyticsPropsPlusEntity);
                                    Linking.openURL(MISC_URLS.addGoogleCalendar());
                                }}
                                showGoogleCalendar={showGoogleCalendar}
                                filtersEnabled={hasActiveFilters}
                                quickFilters={quickFilters}
                                activeFilters={activeFilterChips}
                                selectedQuickFilterId={selectedQuickFilterId}
                                onSelectQuickFilter={(filterId) => {
                                    if (filterId === selectedQuickFilterId) {
                                        setQuickFilter(null);
                                        setTypeaheadSelection(null);
                                        return;
                                    }
                                    if (filterId.startsWith('category:')) {
                                        setTypeaheadSelection(null);
                                        const key = filterId.replace('category:', '') as QuickFilterCategory;
                                        setQuickFilter({ type: 'category', key });
                                        return;
                                    }
                                    if (filterId.startsWith('tag:')) {
                                        setTypeaheadSelection(null);
                                        const tag = filterId.replace('tag:', '');
                                        logEvent(UE.FilterTagAdded, {
                                            ...analyticsPropsPlusEntity,
                                            tag_name: tag,
                                            tag_count: filters.tags.length + 1,
                                        });
                                        setQuickFilter({ type: 'tag', tag });
                                        return;
                                    }
                                    if (filterId.startsWith('organizer:')) {
                                        setTypeaheadSelection(null);
                                        const organizer = filterId.replace('organizer:', '');
                                        setQuickFilter({ type: 'organizer', organizer });
                                        return;
                                    }
                                    if (filterId.startsWith('event_type:')) {
                                        setTypeaheadSelection(null);
                                        const eventType = filterId.replace('event_type:', '');
                                        setQuickFilter({ type: 'event_type', eventType });
                                        return;
                                    }
                                    if (filterId.startsWith('experience:')) {
                                        setTypeaheadSelection(null);
                                        const level = filterId.replace('experience:', '');
                                        setQuickFilter({ type: 'experience', level });
                                        return;
                                    }
                                    if (filterId.startsWith('interactivity:')) {
                                        setTypeaheadSelection(null);
                                        const level = filterId.replace('interactivity:', '');
                                        setQuickFilter({ type: 'interactivity', level });
                                    }
                                }}
                                onPressQuickFilterMore={() => {
                                    logEvent(UE.FilterMorePressed, analyticsPropsPlusEntity);
                                    setFiltersVisible(true);
                                }}
                                typeaheadSuggestions={typeaheadSuggestions}
                                onSelectTypeaheadSuggestion={(suggestion) => {
                                    setTypeaheadSelection(suggestion);
                                    if (suggestion.type === 'organizer') {
                                        setQuickFilter({ type: 'organizer', organizer: suggestion.label });
                                    } else if (suggestion.type === 'event_type') {
                                        setQuickFilter({
                                            type: 'event_type',
                                            eventType: suggestion.value || suggestion.label,
                                        });
                                    } else if (suggestion.type === 'experience') {
                                        setQuickFilter({ type: 'experience', level: suggestion.value || suggestion.label });
                                    } else if (suggestion.type === 'interactivity') {
                                        setQuickFilter({
                                            type: 'interactivity',
                                            level: suggestion.value || suggestion.label,
                                        });
                                    } else {
                                        logEvent(UE.FilterTagAdded, {
                                            ...analyticsPropsPlusEntity,
                                            tag_name: suggestion.label,
                                            tag_count: filters.tags.length + 1,
                                        });
                                        setQuickFilter({ type: 'tag', tag: suggestion.label });
                                    }
                                    setSearchQuery('');
                                }}
                            />

                            <WeekStrip
                                prevWeekDays={prevWeekDays}
                                weekDays={weekDays}
                                nextWeekDays={nextWeekDays}
                                selectedDay={nav.selectedDate}
                                onChangeSelectedDay={handleStripSelectDay}
                                isDaySelectable={isDaySelectable}
                                hasEventsOnDay={hasEventsOnDay}
                                onSwipePrevDay={handleStripSwipePrevDay}
                                onSwipeNextDay={handleStripSwipeNextDay}
                                onLongPress={handleStripLongPress}
                                containerWidth={Math.max(0, windowWidth - spacing.lg * 2)}
                                animateToCurrentWeek={navUpdateSourceRef.current === 'list'}
                                animateDirection={weekStripAnimationDirectionRef.current}
                            />
                            <View style={[styles.headerDivider, showCoachOverlay && styles.headerDividerCoach]} />
                        </View>
                    </View>

                    <CalendarCoachScreenScrim />

                    <View style={styles.listLayer}>
                        <Modal
                            transparent
                            animationType="none"
                            visible={isMonthModalOpen}
                            onRequestClose={() => closeMonthModal("dismiss")}
                        >
                            <Animated.View style={[styles.monthModalBackdrop, { opacity: monthModalAnim }]}>
                                <Pressable
                                    style={StyleSheet.absoluteFillObject}
                                    onPress={() => closeMonthModal("dismiss")}
                                />
                                <Animated.View
                                    style={[
                                        styles.monthModalCard,
                                        {
                                            width: monthModalWidth,
                                            opacity: monthModalAnim,
                                            transform: [
                                                { translateY: monthModalTranslateY },
                                                { scale: monthModalScale },
                                            ],
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.monthModalClose}
                                        onPress={() => closeMonthModal("dismiss")}
                                        accessibilityLabel="Close month picker"
                                    >
                                        <Text style={styles.monthModalCloseText}>X</Text>
                                    </TouchableOpacity>

                                    <View style={styles.monthModalHeader}>
                                        <TouchableOpacity
                                            style={styles.monthNavButton}
                                            onPress={goToPrevMonth}
                                            accessibilityLabel="Previous month"
                                        >
                                            <FAIcon name="chevron-left" size={16} color={colors.white} />
                                        </TouchableOpacity>
                                        <Text style={styles.monthModalTitle} numberOfLines={1} ellipsizeMode="tail">
                                            {monthLabel}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.monthNavButton}
                                            onPress={goToNextMonth}
                                            accessibilityLabel="Next month"
                                        >
                                            <FAIcon name="chevron-right" size={16} color={colors.white} />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.monthModalToday}
                                        onPress={handleMonthModalTodayPress}
                                        accessibilityLabel="Select today"
                                    >
                                        <FAIcon name="calendar-day" size={12} color={colors.white} />
                                        <Text style={styles.monthModalTodayText}>Today</Text>
                                    </TouchableOpacity>

                                    <FullCalendar
                                        currentDate={monthAnchorDate}
                                        onSelectDay={handleMonthModalSelectDay}
                                        hasEventsOnDay={hasEventsOnDay}
                                        selectedDate={nav.selectedDate}
                                        onMonthChange={onMonthChange}
                                    />
                                </Animated.View>
                            </Animated.View>
                        </Modal>
            <View
                pointerEvents="none"
                accessibilityElementsHidden={!showDateToast}
                importantForAccessibility={showDateToast ? "yes" : "no-hide-descendants"}
                style={styles.dateToastBackdrop}
            >
                <Animated.View
                    style={[
                        styles.dateToastCard,
                        {
                            opacity: toastAnim,
                            transform: [{ translateY: toastTranslateY }, { scale: toastScale }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={DATE_TOAST_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.dateToastGradient}
                    >
                        <View style={styles.dateToastIcon}>
                            <FAIcon name="calendar-day" size={12} color={colors.white} />
                        </View>
                        <Text style={styles.dateToastText}>long press for month view</Text>
                    </LinearGradient>
                </Animated.View>
            </View>

            <View style={styles.eventListContainer}>
                <EventList
                    sections={sections}
                    sectionListRef={sectionListRef}
                    isLoadingEvents={isLoadingList}
                    viewMode={listViewMode}
                    isOnWishlist={isOnWishlist}
                    onToggleWishlist={handleToggleWishlist}
                    wishlistEventsCount={wishlistEvents.length}
                    isEventSourceExcluded={isEventSourceExcluded}
                    listHeaderHeight={listHeaderHeight}
                    onListScroll={handleListScroll}
                    onListScrollBeginDrag={handleListScrollBeginDrag}
                    onListReady={handleListReady}
                    listHeaderComponent={
                        shouldShowListHeader ? (
                            <View
                                style={styles.listHeaderWrap}
                                onLayout={(event) => {
                                    const nextHeight = Math.round(event.nativeEvent.layout.height);
                                    setListHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
                                }}
                            >
                                {shouldShowCommunityBanner && (
                                    <View style={styles.noticeWrap}>
                                        <LinearGradient
                                            colors={[colors.surfaceGoldWarm, colors.surfaceGoldLight]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={[styles.noticeCard, showCoachOverlay && styles.noticeCardCoach]}
                                        >
                                            <TouchableOpacity
                                                style={[styles.noticeCloseButton, showCoachOverlay && styles.noticeCloseButtonCoach]}
                                                onPress={handleHideCommunityBanner}
                                                accessibilityRole="button"
                                                accessibilityLabel="Hide banner"
                                            >
                                                <FAIcon name="times" size={12} color={colors.textGoldMuted} />
                                            </TouchableOpacity>
                                            <View style={styles.noticeHeader}>
                                                <View style={[styles.noticeIcon, showCoachOverlay && styles.noticeIconCoach]}>
                                                    <FAIcon name="star" size={14} color={colors.textGold} />
                                                </View>
                                                <View style={styles.noticeCopy}>
                                                    <Text style={styles.noticeTitle}>Follow your favorite organizers</Text>
                                                    <Text style={styles.noticeText}>Upcoming events + discounts</Text>
                                                    <Text style={styles.noticeText}>from your favorite organizers</Text>
                                                </View>
                                            </View>
                                            <View style={styles.noticeFooter}>
                                                <TouchableOpacity
                                                    style={styles.noticeCta}
                                                    onPress={handleFollowOrganizersPress}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`${bannerCtaLabel} organizers`}
                                                >
                                                    <Text style={styles.noticeCtaText}>{bannerCtaLabel}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </LinearGradient>
                                    </View>
                                )}
                                {shouldShowRecommendations ? (
                                    <View style={styles.recommendationsHeaderWrap}>
                                        <View style={[styles.recommendationsCard, showCoachOverlay && styles.recommendationsCardCoach]}>
                                            <View style={styles.recommendationsHeader}>
                                                <Text style={styles.recommendationsTitle}>Recommended</Text>
                                                <View style={styles.recommendationsActions}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.recommendationsActionButton,
                                                            showCoachOverlay && styles.recommendationsActionButtonCoach,
                                                        ]}
                                                        onPress={handleHideRecommendations}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Hide Recommended"
                                                    >
                                                        <Text style={styles.recommendationsActionText}>Hide</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            {recommendations.length === 0 && (
                                                <View style={[styles.recommendationsEmpty, showCoachOverlay && styles.recommendationsEmptyCoach]}>
                                                    <Text style={styles.recommendationsEmptyText}>
                                                        No recommended events yet.
                                                    </Text>
                                                </View>
                                            )}
                                            {recommendations.length > 0 && (
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.recommendationsScroll}
                                                    onLayout={(event) => {
                                                        const nextWidth = Math.round(event.nativeEvent.layout.width);
                                                        setRecommendationsLaneWidth((prev) =>
                                                            prev === nextWidth ? prev : nextWidth
                                                        );
                                                    }}
                                                >
                                                    {recommendations.map((event, index) => {
                                                        const promoCodes = getPromoCodesForEvent(event);
                                                        const promoLabels = promoCodes.map((promoCode) =>
                                                            promoCode.discount_type === "percent"
                                                                ? `${promoCode.discount}% off`
                                                                : `$${promoCode.discount} off`
                                                        );

                                                        return (
                                                        <TouchableOpacity
                                                            key={event.id}
                                                            style={[
                                                                styles.recommendationCard,
                                                                showCoachOverlay && styles.recommendationCardCoach,
                                                                {
                                                                    width: recommendationCardWidth,
                                                                    marginRight:
                                                                            index === recommendations.length - 1 ? 0 : spacing.sm,
                                                                    },
                                                                ]}
                                                                onPress={() => handleRecommendationPress(event)}
                                                                activeOpacity={0.9}
                                                            >
                                                                <View style={styles.recommendationMedia}>
                                                                    {event.image_url ? (
                                                                        <Image
                                                                            source={{ uri: event.image_url }}
                                                                            style={styles.recommendationImage}
                                                                            resizeMode="cover"
                                                                        />
                                                                    ) : (
                                                                        <View style={styles.recommendationPlaceholder}>
                                                                            <FAIcon name="calendar-day" size={16} color={colors.textMuted} />
                                                                        </View>
                                                                    )}
                                                                    {promoLabels.length > 0 && (
                                                                        <View style={styles.recommendationPromoBadgeStack}>
                                                                            {promoLabels.map((label, labelIndex) => (
                                                                                <View
                                                                                    key={`${label}-${labelIndex}`}
                                                                                    style={[
                                                                                        styles.recommendationPromoBadge,
                                                                                        labelIndex > 0 &&
                                                                                            styles.recommendationPromoBadgeOffset,
                                                                                    ]}
                                                                                >
                                                                                    <Text style={styles.recommendationPromoText}>
                                                                                        {label}
                                                                                    </Text>
                                                                                </View>
                                                                            ))}
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <View style={styles.recommendationBody}>
                                                                    <Text style={styles.recommendationTitle} numberOfLines={2}>
                                                                        {event.name}
                                                                    </Text>
                                                                    <Text style={styles.recommendationOrganizer} numberOfLines={1}>
                                                                        {event.organizer?.name || "Organizer"}
                                                                    </Text>
                                                                    <Text style={styles.recommendationDate} numberOfLines={1}>
                                                                        {formatDate(event, true)}
                                                                    </Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            )}
                                        </View>
                                    </View>
                                ) : shouldShowHiddenRecommendations ? (
                                    <View style={styles.recommendationsHeaderWrap}>
                                        <View style={[styles.recommendationsHiddenCard, showCoachOverlay && styles.recommendationsHiddenCardCoach]}>
                                            <Text style={styles.recommendationsHiddenText}>
                                                Recommended is hidden
                                            </Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.recommendationsHiddenButton,
                                                    showCoachOverlay && styles.recommendationsHiddenButtonCoach,
                                                ]}
                                                onPress={handleShowRecommendations}
                                                accessibilityRole="button"
                                                accessibilityLabel="Show Recommended"
                                            >
                                                <Text style={styles.recommendationsHiddenButtonText}>Show</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        ) : null
                    }
                />
            </View>
            </View>
            </View>
            </PopupManager>
        </View>
    );
};

export default EventCalendarView;

const NOTICE_ICON_SIZE = 36;

const styles = StyleSheet.create({
    screenGradient: { flex: 1 },
    container: { flex: 1, backgroundColor: "transparent", position: "relative" },
    headerLayer: {
        zIndex: 0,
    },
    listLayer: {
        flex: 1,
        zIndex: 2,
    },
    calendarCoachScreenScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: CALENDAR_COACH_SCREEN_SCRIM,
        zIndex: 1,
    },
    headerSlot: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    offlineHeaderCard: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 3,
    },
    offlineHeaderText: {
        fontSize: fontSizes.lg,
        fontFamily: fontFamilies.display,
        color: colors.textPrimary,
    },
    headerSurface: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 5 },
        shadowRadius: 12,
        elevation: 4,
    },
    headerSurfaceCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    headerDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.borderLavenderSoft,
        marginTop: spacing.xs,
        marginHorizontal: spacing.lg,
        opacity: 0.8,
    },
    headerDividerCoach: {
        backgroundColor: CALENDAR_COACH_BORDER_COLOR,
    },
    listHeaderWrap: {
        paddingBottom: spacing.xs,
    },
    noticeWrap: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    noticeCard: {
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.mdPlus,
        paddingRight: spacing.xxl,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderGoldSoft,
        overflow: "hidden",
        ...shadows.card,
    },
    noticeCardCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    noticeHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    noticeFooter: {
        marginTop: spacing.sm,
        flexDirection: "row",
        paddingLeft: NOTICE_ICON_SIZE + spacing.md,
    },
    noticeCloseButton: {
        position: "absolute",
        top: spacing.xs,
        right: spacing.xs,
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.borderGoldLight,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    noticeCloseButtonCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    noticeIcon: {
        width: NOTICE_ICON_SIZE,
        height: NOTICE_ICON_SIZE,
        borderRadius: NOTICE_ICON_SIZE / 2,
        backgroundColor: colors.surfaceGoldLight,
        borderWidth: 1,
        borderColor: colors.borderGoldLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    noticeIconCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    noticeCopy: {
        flex: 1,
        minWidth: 0,
    },
    noticeTitle: {
        color: colors.textBrown,
        fontSize: fontSizes.lg,
        fontWeight: "700",
        fontFamily: fontFamilies.display,
        marginBottom: spacing.xxs,
    },
    noticeText: {
        color: colors.textGoldMuted,
        fontSize: fontSizes.smPlus,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        flexShrink: 1,
    },
    noticeCta: {
        backgroundColor: colors.brandInk,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
    },
    noticeCtaText: {
        color: colors.white,
        fontSize: fontSizes.smPlus,
        fontWeight: "700",
        fontFamily: fontFamilies.body,
    },
    recommendationsHeaderWrap: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    recommendationsCard: {
        width: "100%",
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        padding: spacing.md,
        ...shadows.card,
    },
    recommendationsCardCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    recommendationsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
    },
    recommendationsTitle: {
        color: colors.textPrimary,
        fontSize: fontSizes.xxl,
        fontWeight: "700",
        fontFamily: fontFamilies.display,
    },
    recommendationsActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    recommendationsActionButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.smPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceMutedLight,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
    },
    recommendationsActionButtonCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    recommendationsActionText: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
    recommendationsScroll: {
        paddingBottom: spacing.xs,
    },
    recommendationsHiddenCard: {
        width: "100%",
        backgroundColor: colors.surfaceMutedLight,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    recommendationsHiddenCardCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    recommendationsHiddenText: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
    recommendationsHiddenButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.smPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
    },
    recommendationsHiddenButtonCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    recommendationsHiddenButtonText: {
        color: colors.textPrimary,
        fontSize: fontSizes.smPlus,
        fontWeight: "700",
        fontFamily: fontFamilies.body,
    },
    recommendationsEmpty: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.surfaceMutedLight,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        marginBottom: spacing.sm,
    },
    recommendationsEmptyCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    recommendationsEmptyText: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
    recommendationCard: {
        flexGrow: 0,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        overflow: "hidden",
    },
    recommendationCardCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    recommendationMedia: {
        width: "100%",
        height: 92,
    },
    recommendationImage: {
        width: "100%",
        height: "100%",
    },
    recommendationPlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: colors.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
    },
    recommendationPromoBadgeStack: {
        position: "absolute",
        top: 0,
        left: 0,
        alignItems: "flex-start",
    },
    recommendationPromoBadge: {
        backgroundColor: "rgba(255, 215, 0, 0.9)",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderTopLeftRadius: radius.md,
        borderBottomRightRadius: radius.md,
    },
    recommendationPromoBadgeOffset: {
        marginTop: spacing.xs,
    },
    recommendationPromoText: {
        color: colors.black,
        fontSize: fontSizes.smPlus,
        fontWeight: "700",
        fontFamily: fontFamilies.body,
    },
    recommendationBody: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.smPlus,
    },
    recommendationTitle: {
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: "700",
        fontFamily: fontFamilies.body,
    },
    recommendationOrganizer: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    recommendationDate: {
        color: colors.textSlate,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    eventListContainer: {
        flex: 1,
        paddingTop: 0,
        marginTop: 0,
        backgroundColor: 'transparent',
    },
    monthModalBackdrop: {
        flex: 1,
        backgroundColor: colors.backdropNight,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    monthModalCard: {
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.lgPlus,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderNight,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 12,
    },
    monthModalClose: {
        position: "absolute",
        top: spacing.sm,
        right: spacing.sm,
        padding: spacing.xs,
        zIndex: 2,
    },
    monthModalCloseText: {
        color: colors.textNightSubtle,
        fontSize: fontSizes.xxl,
        fontFamily: fontFamilies.body,
    },
    monthModalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.smPlus,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    monthNavButton: {
        width: spacing.xxxl,
        height: spacing.xxxl,
        borderRadius: radius.lg,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
    },
    monthModalTitle: {
        color: colors.white,
        fontSize: fontSizes.xxl,
        fontWeight: "700",
        fontFamily: fontFamilies.display,
        flexShrink: 1,
        textAlign: "center",
    },
    monthModalToday: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xsPlus,
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.xsPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        marginBottom: spacing.md,
    },
    monthModalTodayText: {
        color: colors.white,
        fontSize: fontSizes.smPlus,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
        letterSpacing: 0.3,
    },
    dateToastBackdrop: {
        position: "absolute",
        bottom: spacing.xxxl,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        zIndex: 20,
    },
    dateToastCard: {
        maxWidth: 420,
        width: "100%",
        backgroundColor: DATE_TOAST_BACKGROUND,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        overflow: "hidden",
        shadowColor: colors.black,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 20,
        elevation: 12,
    },
    dateToastGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.lgPlus,
        paddingVertical: spacing.mdPlus,
    },
    dateToastIcon: {
        width: spacing.xxl,
        height: spacing.xxl,
        borderRadius: spacing.xxl / 2,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    dateToastText: {
        color: colors.white,
        fontSize: fontSizes.xxl,
        fontWeight: "700",
        fontFamily: fontFamilies.display,
        letterSpacing: 0.4,
        textAlign: "center",
        flexShrink: 1,
    },
});
