import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
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
import moment from "moment-timezone";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { useFetchEvents } from "../../../Common/db-axios/useEvents";
import { useFetchFollows } from "../../../Common/db-axios/useFollows";
import { useCommonContext } from "../../../Common/hooks/CommonContext";
import { getAvailableOrganizers } from "../hooks/calendarUtils";
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from "../hooks/eventHelpers";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { FiltersView, FilterState } from "./Filters/FiltersView";
import EventList, { EVENT_SECTION_HEADER_HEIGHT } from "./EventList";
import { ITEM_HEIGHT } from "./EventListItem";
import { CLASSIC_ITEM_HEIGHT } from "./EventListItemClassic";
import { logEvent } from "../../../Common/hooks/logger";
import { ADMIN_EMAILS, MISC_URLS } from "../../../config";
import { EventWithMetadata, NavStack } from "../../../Common/Nav/NavStackType";
import { PopupManager } from "../../PopupManager";
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
    eventListThemes,
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
}

const DATE_COACH_COUNT_KEY = "dateCoachShownCount";
const DATE_COACH_LAST_SHOWN_KEY = "dateCoachLastShownAt";
const DATE_COACH_MAX_SHOWS = 3;
const DATE_COACH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const COMMUNITY_BANNER_HIDDEN_KEY = "communityBannerHidden";
const RECOMMENDATIONS_HIDDEN_KEY = "organizerRecommendationsHidden";
const RECOMMENDATION_WINDOW_START_DAYS = 2;
const RECOMMENDATION_WINDOW_END_DAYS = 10;
const EMPTY_EVENTS: EventWithMetadata[] = [];

const EventCalendarView: React.FC<Props> = ({
    events,
    showGoogleCalendar = false,
    featuredEvents,
    entity = "events",
    entityId,
}) => {
    type DateCoachMeta = { count: number; lastShownAt: number | null };
    const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
    const [showDateToast, setShowDateToast] = useState(false);
    const [dateCoachMeta, setDateCoachMeta] = useState<DateCoachMeta | null>(null);
    const [communityBannerHidden, setCommunityBannerHidden] = useState(false);
    const [recommendationsHidden, setRecommendationsHidden] = useState<boolean | null>(null);
    const [listHeaderHeight, setListHeaderHeight] = useState(0);
    const [recommendationsLaneWidth, setRecommendationsLaneWidth] = useState(0);
    const pendingScrollDateRef = useRef<Date | null>(null);
    const lastScrollDateRef = useRef<Date | null>(null);
    const lastScrollHeaderHeightRef = useRef<number | null>(null);
    const pendingCoachRef = useRef(false);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;
    const monthModalAnim = useRef(new Animated.Value(0)).current;
    const { authUserId, userProfile, currentDeepLink } = useUserContext();
    const navigation = useNavigation<NavStack>();
    const { myCommunities } = useCommonContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const { data: fetchedEventsData, isLoading: isLoadingEvents } = useFetchEvents({
        includeApprovalPending: isAdmin,
        includePrivate: !!authUserId,
    });
    const fetchedEvents = fetchedEventsData ?? EMPTY_EVENTS;
    const { data: follows } = useFetchFollows(authUserId);
    const organizers = useMemo(() => getAvailableOrganizers(fetchedEvents), [fetchedEvents]);
    const organizerColorMap = useMemo(() => mapOrganizerColors(organizers as any), [organizers]);
    const eventsWithMetadata = useMemo(
        () => addEventMetadata({ events: fetchedEvents, organizerColorMap }),
        [fetchedEvents, organizerColorMap]
    );
    const sourceEvents = useMemo(
        () => (events ? addEventMetadata({ events, organizerColorMap }) : eventsWithMetadata),
        [events, eventsWithMetadata, organizerColorMap]
    );
    const isLoadingList = events ? false : isLoadingEvents;
    const isMainEventsView = !events && entity === "events";
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
    const organizerOptions = useMemo(() => {
        const options = new Map<string, { id: string; name: string; count: number }>();
        for (const event of sourceEvents || []) {
            const organizer = event.organizer;
            const name = organizer?.name?.trim();
            if (!name) continue;
            const idValue = organizer?.id?.toString() || name.toLowerCase();
            const existing = options.get(idValue);
            if (existing) {
                existing.count += 1;
            } else {
                options.set(idValue, { id: idValue, name, count: 1 });
            }
        }
        return Array.from(options.values()).sort((a, b) => b.count - a.count);
    }, [sourceEvents]);

    const analyticsProps = useEventAnalyticsProps();
    const analyticsPropsPlusEntity = { ...analyticsProps, entity, entityId };

    const eventListTheme = 'welcome' as const;
    const eventListConfig = eventListThemes[eventListTheme];
    const eventListColors = eventListConfig.colors;
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
    const scrollToTopToken = (route.params as { scrollToTop?: number } | undefined)?.scrollToTop;
    const didFilterScrollRef = useRef(false);

    const scrollListToOffset = (offset: number, animated = true) => {
        const list = sectionListRef.current;
        if (!list) return;
        if (typeof list.scrollToOffset === "function") {
            list.scrollToOffset({ offset, animated });
            return;
        }
        const responder = (list as { getScrollResponder?: () => { scrollTo?: (options: { y: number; animated: boolean }) => void } })
            .getScrollResponder?.();
        if (typeof responder?.scrollTo === "function") {
            responder.scrollTo({ y: offset, animated });
            return;
        }
        const fallback = list as { scrollTo?: (options: { y: number; animated: boolean }) => void };
        if (typeof fallback.scrollTo === "function") {
            fallback.scrollTo({ y: offset, animated });
        }
    };

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
        const baseEvents = quickFilter ? sourceEvents.filter(matchesQuickFilter) : sourceEvents;

        const normalizedQuery = normalizeSearchText(searchQuery);
        if (normalizedQuery.length > 0) {
            return baseEvents.filter((event) => {
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

                return fields.some((field) =>
                    normalizeSearchText(field).includes(normalizedQuery)
                );
            });
        }

        return baseEvents.filter((event) => {
            const tags = [...(event.classification?.tags || []), ...(event.tags || [])];
            const matchesTags =
                filters.tags.length === 0 ||
                filters.tags.some((t) => tags.some((tag) => tag.toLowerCase() === t.toLowerCase()));
            const exp = normalize(event.classification?.experience_level);
            const matchesExp = filters.experience_levels.length === 0 || filters.experience_levels.includes(exp || "");
            const inter = normalize(event.classification?.interactivity_level);
            const matchesInter = filters.interactivity_levels.length === 0 || filters.interactivity_levels.includes(inter || "");
            const resolvedType = resolveEventTypeValue(event);
            const matchesType =
                filters.event_types.length === 0
                || (resolvedType && filters.event_types.includes(resolvedType));
            return matchesTags && matchesExp && matchesInter && matchesType;
        });
    }, [sourceEvents, searchQuery, filters, quickFilter]);

    const recommendations = useMemo(() => {
        if (!isMainEventsView || !sourceEvents || followedOrganizerIds.size === 0) {
            return [] as EventWithMetadata[];
        }

        const now = moment().tz(TZ).startOf("day");
        const windowStart = moment(now).add(RECOMMENDATION_WINDOW_START_DAYS, "days").startOf("day");
        const windowEnd = moment(now).add(RECOMMENDATION_WINDOW_END_DAYS, "days").endOf("day");

        const isWithinRecommendationWindow = (event: EventWithMetadata) => {
            const eventStart = moment.tz(event.start_date, TZ);
            if (!eventStart.isValid()) return false;
            return eventStart.isBetween(windowStart, windowEnd, undefined, "[]");
        };

        const organizerEvents = sourceEvents.filter((event) => {
            const organizerId = event.organizer?.id?.toString();
            if (!organizerId || !followedOrganizerIds.has(organizerId)) return false;
            return isWithinRecommendationWindow(event);
        });

        const eligible = organizerEvents;

        const hasPromo = (event: EventWithMetadata) => getPromoCodesForEvent(event).length > 0;

        const shuffle = <T,>(items: T[]) => {
            const shuffled = [...items];
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const promoEvents = organizerEvents.filter(hasPromo);
        const pickedPromo = shuffle(promoEvents).slice(0, 2);
        const pickedPromoIds = new Set(pickedPromo.map((event) => event.id));
        const promoFillNeeded = Math.max(0, 2 - pickedPromo.length);
        const promoFillPool = sourceEvents.filter(
            (event) => isWithinRecommendationWindow(event) && hasPromo(event)
        );
        const promoFill =
            promoFillNeeded > 0
                ? shuffle(promoFillPool.filter((event) => !pickedPromoIds.has(event.id))).slice(
                    0,
                    promoFillNeeded
                )
                : [];
        const selectedPromo = [...pickedPromo, ...promoFill];

        const pickedIds = new Set(selectedPromo.map((event) => event.id));
        const nonPromoRemaining = eligible.filter(
            (event) => !pickedIds.has(event.id) && !hasPromo(event)
        );
        const fallbackRemaining = eligible.filter((event) => !pickedIds.has(event.id));
        const initialPicks = shuffle(nonPromoRemaining).slice(0, 3);
        const randomPickIds = new Set(initialPicks.map((event) => event.id));
        const remainingSlots = 3 - initialPicks.length;
        const fillerPicks =
            remainingSlots > 0
                ? shuffle(fallbackRemaining.filter((event) => !randomPickIds.has(event.id))).slice(
                    0,
                    remainingSlots
                )
                : [];
        const randomPicks = [...initialPicks, ...fillerPicks];

        const selections = [...selectedPromo, ...randomPicks];
        if (selections.length <= 1) return selections;

        const promoPicks = selections.filter(hasPromo);
        if (promoPicks.length === 0) return selections;

        const nonPromoPicks = selections.filter((event) => !hasPromo(event));
        return [...promoPicks, ...nonPromoPicks];
    }, [currentDeepLink, followedOrganizerIds, isMainEventsView, sourceEvents]);

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

    const scrollToDate = (date: Date) => {
        lastScrollDateRef.current = date;
        if (hasListHeader && listHeaderHeight === 0) {
            pendingScrollDateRef.current = date;
            return;
        }
        const formatted = moment(date).tz(TZ).format(SECTION_DATE_FORMAT);
        const idx = sections.findIndex((s) => s.title === formatted);
        if (idx !== -1 && sectionListRef.current) {
            const rowHeight = listViewMode === 'classic' ? CLASSIC_ITEM_HEIGHT : ITEM_HEIGHT;
            const headerOffset = hasListHeader ? listHeaderHeight : 0;
            const offset = sections.slice(0, idx).reduce((total, section) => {
                return total + EVENT_SECTION_HEADER_HEIGHT + section.data.length * rowHeight;
            }, headerOffset);
            lastScrollHeaderHeightRef.current = headerOffset;
            scrollListToOffset(Math.max(0, offset));
        }
    };

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

    const onSelectDay = (day: Date) => {
        if (!isDaySelectable(day)) {
            return;
        }
        const chosen = resolveEventDay(day);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };

        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
        closeMonthModal();
    };

    const goToPrevDay = () => {
        const prevDay = ny.addDays(nav.selectedDate, -1).toDate();
        if (!isDaySelectable(prevDay)) return;
        const chosen = resolveEventDay(prevDay);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
    };

    const goToNextDay = () => {
        const nextDay = ny.addDays(nav.selectedDate, 1).toDate();
        if (!isDaySelectable(nextDay)) return;
        const chosen = resolveEventDay(nextDay);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
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

    const goToToday = () => {
        const today = moment().tz(TZ).toDate();
        if (!isDaySelectable(today)) return;
        const chosen = resolveEventDay(today);
        const next = { weekAnchorDate: ny.startOfWeek(chosen).toDate(), selectedDate: chosen };
        setNav(next);
        setMonthAnchorDate(moment(chosen).startOf("month").toDate());
        scrollToDate(chosen);
    };

    const openMonthModal = (day?: Date) => {
        const anchor = day ?? nav.selectedDate;
        setMonthAnchorDate(moment(anchor).startOf("month").toDate());
        if (!isMonthModalOpen) {
            logEvent(UE.DateBarCalendarPressed, { ...analyticsPropsPlusEntity, expanded: true });
        }
        setIsMonthModalOpen(true);
    };
    const closeMonthModal = () => {
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

    const handleMonthModalTodayPress = () => {
        logEvent(UE.DateBarTodayPressed, analyticsPropsPlusEntity);
        onSelectDay(moment().tz(TZ).toDate());
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
    const shouldShowRecommendations =
        isMainEventsView && hasFollowedOrganizers && recommendationsHidden !== true;
    const shouldShowHiddenRecommendations =
        isMainEventsView && hasFollowedOrganizers && recommendationsHidden === true && !shouldShowCommunityBanner;
    const shouldShowListHeader =
        shouldShowCommunityBanner || shouldShowRecommendations || shouldShowHiddenRecommendations;
    const hasListHeader = shouldShowListHeader;
    const bannerCtaLabel = "Follow";

    useEffect(() => {
        if (!__DEV__ || !isMainEventsView) return;
        console.log("[recommendations] state", {
            hasFollowedOrganizers,
            followedOrganizerCount: followedOrganizerIds.size,
            recommendationsHidden,
            recommendationsCount: recommendations.length,
        });
    }, [
        hasFollowedOrganizers,
        followedOrganizerIds.size,
        isMainEventsView,
        recommendations.length,
        recommendationsHidden,
    ]);

    useEffect(() => {
        if (shouldShowListHeader) return;
        setListHeaderHeight(0);
    }, [shouldShowListHeader]);

    useEffect(() => {
        if (listHeaderHeight === 0 || !pendingScrollDateRef.current) return;
        const target = pendingScrollDateRef.current;
        pendingScrollDateRef.current = null;
        requestAnimationFrame(() => scrollToDate(target));
    }, [listHeaderHeight]);

    useEffect(() => {
        if (!lastScrollDateRef.current) return;
        if (hasListHeader && listHeaderHeight === 0) {
            pendingScrollDateRef.current = lastScrollDateRef.current;
            return;
        }
        const headerOffset = hasListHeader ? listHeaderHeight : 0;
        if (lastScrollHeaderHeightRef.current === headerOffset) return;
        requestAnimationFrame(() => scrollToDate(lastScrollDateRef.current as Date));
    }, [hasListHeader, listHeaderHeight]);

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
        <LinearGradient
            colors={eventListColors}
            locations={eventListConfig.locations}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.screenGradient}
        >
            <PopupManager events={sourceEvents} onListViewModeChange={handleListViewModeChange}>
                <View pointerEvents="none" style={styles.screenGlowTop} />
                <View pointerEvents="none" style={styles.screenGlowMid} />
                <View pointerEvents="none" style={styles.screenGlowBottom} />
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
                        searchQuery={searchQuery}
                        onSearchQueryChange={handleSearchQueryChange}
                        organizerOptions={organizerOptions}
                    />

                    <View style={styles.headerSurface}>
                <TopBar
                    searchQuery={searchQuery}
                    setSearchQuery={handleSearchQueryChange}
                    onSearchFocus={() => {
                        logEvent(UE.FilterSearchFocused, analyticsPropsPlusEntity);
                    }}
                    onPressFilters={() => {
                        if (Object.values(filters).some((a) => a.length > 0)) {
                            logEvent(UE.EventCalendarViewFiltersDisabled, analyticsPropsPlusEntity);
                            setFilters({ tags: [], event_types: [], experience_levels: [], interactivity_levels: [] });
                        } else {
                            logEvent(UE.EventCalendarViewFiltersEnabled, analyticsPropsPlusEntity);
                            setFiltersVisible(true);
                        }
                    }}
                    onPressGoogleCalendar={() => {
                        logEvent(UE.EventCalendarViewGoogleCalendar, analyticsPropsPlusEntity);
                        Linking.openURL(MISC_URLS.addGoogleCalendar());
                    }}
                    showGoogleCalendar={showGoogleCalendar}
                    filtersEnabled={Object.values(filters).some((a) => a.length > 0)}
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
                            setQuickFilter({ type: 'event_type', eventType: suggestion.value || suggestion.label });
                        } else if (suggestion.type === 'experience') {
                            setQuickFilter({ type: 'experience', level: suggestion.value || suggestion.label });
                        } else if (suggestion.type === 'interactivity') {
                            setQuickFilter({ type: 'interactivity', level: suggestion.value || suggestion.label });
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
                />
                <View style={styles.headerDivider} />
            </View>

            <Modal
                transparent
                animationType="none"
                visible={isMonthModalOpen}
                onRequestClose={closeMonthModal}
            >
                <Animated.View style={[styles.monthModalBackdrop, { opacity: monthModalAnim }]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMonthModal} />
                    <Animated.View
                        style={[
                            styles.monthModalCard,
                            {
                                width: monthModalWidth,
                                opacity: monthModalAnim,
                                transform: [{ translateY: monthModalTranslateY }, { scale: monthModalScale }],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.monthModalClose}
                            onPress={closeMonthModal}
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
                            onSelectDay={onSelectDay}
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
                        colors={[colors.brandIndigo, colors.brandPurple, colors.brandPink]}
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
                    listHeaderHeight={listHeaderHeight}
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
                                            style={styles.noticeCard}
                                        >
                                            <TouchableOpacity
                                                style={styles.noticeCloseButton}
                                                onPress={handleHideCommunityBanner}
                                                accessibilityRole="button"
                                                accessibilityLabel="Hide banner"
                                            >
                                                <FAIcon name="times" size={12} color={colors.textGoldMuted} />
                                            </TouchableOpacity>
                                            <View style={styles.noticeHeader}>
                                                <View style={styles.noticeIcon}>
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
                                        <View style={styles.recommendationsCard}>
                                            <View style={styles.recommendationsHeader}>
                                                <Text style={styles.recommendationsTitle}>Recommended</Text>
                                                <View style={styles.recommendationsActions}>
                                                    <TouchableOpacity
                                                        style={styles.recommendationsActionButton}
                                                        onPress={handleHideRecommendations}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Hide Recommended"
                                                    >
                                                        <Text style={styles.recommendationsActionText}>Hide</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            {recommendations.length === 0 && (
                                                <View style={styles.recommendationsEmpty}>
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
                                        <View style={styles.recommendationsHiddenCard}>
                                            <Text style={styles.recommendationsHiddenText}>
                                                Recommended is hidden
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.recommendationsHiddenButton}
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
            </PopupManager>
        </LinearGradient>
    );
};

export default EventCalendarView;

const NOTICE_ICON_SIZE = 36;

const styles = StyleSheet.create({
    screenGradient: { flex: 1 },
    screenGlowTop: {
        position: 'absolute',
        top: -70,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: colors.brandGlowTop,
    },
    screenGlowMid: {
        position: 'absolute',
        top: 140,
        left: -120,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowMid,
    },
    screenGlowBottom: {
        position: 'absolute',
        bottom: -70,
        left: -90,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.brandGlowWarm,
    },
    container: { flex: 1, backgroundColor: "transparent" },
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
    headerDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.borderLavenderSoft,
        marginTop: spacing.xs,
        marginHorizontal: spacing.lg,
        opacity: 0.8,
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
        backgroundColor: colors.brandPurple,
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
