import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    View,
    StyleSheet,
    SectionList,
    Linking,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    useWindowDimensions,
} from "react-native";
import { useIsFocused, useRoute } from "@react-navigation/native";
import moment from "moment-timezone";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { useFetchEvents } from "../../../Common/db-axios/useEvents";
import { getAvailableOrganizers } from "../hooks/calendarUtils";
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from "../hooks/eventHelpers";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { FiltersView, FilterState } from "./Filters/FiltersView";
import EventList from "./EventList";
import { EventListViewIntroModal } from "./EventListViewIntroModal";
import { logEvent } from "../../../Common/hooks/logger";
import { ADMIN_EMAILS, MISC_URLS } from "../../../config";
import { EventWithMetadata } from "../../../Common/Nav/NavStackType";
import { PopupManager } from "../../PopupManager";
import { TopBar, ChipTone, QuickFilterItem, TypeaheadSuggestion, ActiveFilterChip } from "./TopBar";
import { WeekStrip } from "./WeekStrip";
import { SECTION_DATE_FORMAT } from "../hooks/useGroupedEventsMain";
import { getAllClassificationsFromEvents } from "../../../utils/getAllClassificationsFromEvents";
import { UE } from "../../../userEventTypes";
import { useEventAnalyticsProps } from "../../../Common/hooks/useAnalytics";
import {
    calendarExperienceTone,
    calendarInteractivityTones,
    calendarOrganizerTone,
    calendarTypeChips,
    colors,
    eventListThemes,
    fontFamilies,
    fontSizes,
    radius,
    spacing,
} from "../../../components/styles";

import {
    TZ,
    NavState,
    ny,
    hasEventsOnDayNY,
    computeInitialState,
    deriveWeekArrays,
} from "./calendarNavUtils";
import { FullCalendar } from "./FullCalendar";
import {
    EventListViewMode,
    getEventListIntroSeen,
    getEventListViewMode,
    setEventListIntroSeen,
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
    const pendingCoachRef = useRef(false);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const { data: fetchedEvents = [], isLoading: isLoadingEvents } = useFetchEvents({
        includeApprovalPending: isAdmin,
    });
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
    const isFocused = useIsFocused();
    const [listViewMode, setListViewMode] = useState<EventListViewMode>('image');
    const [showListViewIntro, setShowListViewIntro] = useState(false);

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
        let isActive = true;
        if (!isFocused) {
            return () => {
                isActive = false;
            };
        }
        getEventListIntroSeen().then((seen) => {
            if (isActive && !seen) {
                setShowListViewIntro(true);
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

    const allClassifications = useMemo(() => {
        if (!sourceEvents)
            return { tags: [], experience_levels: [], interactivity_levels: [], event_types: [] };
        return getAllClassificationsFromEvents(sourceEvents);
    }, [sourceEvents]);

    const analyticsProps = useEventAnalyticsProps();
    const analyticsPropsPlusEntity = { ...analyticsProps, entity, entityId };

    const eventListTheme = 'welcome' as const;
    const eventListConfig = eventListThemes[eventListTheme];
    const eventListColors = eventListConfig.colors;
    const { width: windowWidth } = useWindowDimensions();
    const monthModalWidth = Math.max(0, windowWidth - spacing.lg * 2);

    const sectionListRef = useRef<SectionList>(null);
    const route = useRoute();
    const scrollToTopToken = (route.params as { scrollToTop?: number } | undefined)?.scrollToTop;

    useEffect(() => {
        if (!scrollToTopToken) return;
        requestAnimationFrame(() => {
            sectionListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, [scrollToTopToken]);

    const handleListViewModeChange = (mode: EventListViewMode) => {
        setListViewMode(mode);
        void setStoredEventListViewMode(mode);
    };

    const handleIntroSwitchToClassic = () => {
        handleListViewModeChange('classic');
        setShowListViewIntro(false);
        void setEventListIntroSeen(true);
    };

    const handleIntroKeepNew = () => {
        handleListViewModeChange('image');
        setShowListViewIntro(false);
        void setEventListIntroSeen(true);
    };

    const eventHasTag = (event: EventWithMetadata, tag: string) => {
        const target = tag.toLowerCase();
        const combinedTags = [...(event.tags || []), ...(event.classification?.tags || [])];
        return combinedTags.some((t) => t.toLowerCase().includes(target));
    };

    const normalizeSearchText = (value?: string) =>
        value ? value.toLowerCase().replace(/[_-]+/g, " ").trim() : "";

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
            if (eventType === 'play_party') {
                return event.play_party === true || normalizeValue(event.type || '') === eventType;
            }
            if (eventType === 'munch') {
                return event.is_munch === true || normalizeValue(event.type || '') === eventType;
            }
            return normalizeValue(event.type || '') === eventType;
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
                    event.type && event.type !== 'event' ? event.type : undefined,
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
            const matchesType =
                filters.event_types.length === 0 || filters.event_types.includes("events") || filters.event_types.includes(event.type);
            return matchesTags && matchesExp && matchesInter && matchesType;
        });
    }, [sourceEvents, searchQuery, filters, quickFilter]);

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

        for (const event of events || []) {
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
    }, [allClassifications, events]);

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
            if (['event', 'events'].includes(label.toLowerCase())) return;
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

    // Re-sanitize selection when filters change
    useEffect(() => {
        const recomputed = computeInitialState(filteredEvents);
        setNav((prev) => {
            const selectedStillOk = !ny.isBeforeToday(prev.selectedDate);
            if (selectedStillOk) {
                const correctAnchor = ny.startOfWeek(prev.selectedDate).toDate();
                if (!ny.startOfWeek(prev.weekAnchorDate).isSame(correctAnchor, "day")) {
                    const next = { weekAnchorDate: correctAnchor, selectedDate: prev.selectedDate };
                    return next;
                }
                return prev;
            }
            return recomputed;
        });
        setMonthAnchorDate(moment(recomputed.weekAnchorDate).startOf("month").toDate());
    }, [filteredEvents]);

    const { prevWeekDays, weekDays, nextWeekDays } = useMemo(
        () => deriveWeekArrays(nav.weekAnchorDate),
        [nav.weekAnchorDate]
    );

    // Treat all days before today as disabled/grey.
    const isDaySelectable = (d: Date | string) => !ny.isBeforeToday(d);
    const hasEventsOnDay = (d: Date | string) => hasEventsOnDayNY(filteredEvents, d);

    const scrollToDate = (date: Date) => {
        const formatted = moment(date).tz(TZ).format(SECTION_DATE_FORMAT);
        const idx = sections.findIndex((s) => s.title === formatted);
        if (idx !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                sectionIndex: idx,
                itemIndex: 0,
                animated: true,
            });
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
        const next = { weekAnchorDate: ny.startOfWeek(day).toDate(), selectedDate: day };

        setNav(next);
        setMonthAnchorDate(moment(day).startOf("month").toDate());
        scrollToDate(day);
        setIsMonthModalOpen(false);
    };

    const goToPrevDay = () => {
        const prevDay = ny.addDays(nav.selectedDate, -1).toDate();
        if (!isDaySelectable(prevDay)) return;
        const next = { weekAnchorDate: ny.startOfWeek(prevDay).toDate(), selectedDate: prevDay };
        setNav(next);
        setMonthAnchorDate(moment(prevDay).startOf("month").toDate());
        scrollToDate(prevDay);
    };

    const goToNextDay = () => {
        const nextDay = ny.addDays(nav.selectedDate, 1).toDate();
        if (!isDaySelectable(nextDay)) return;
        const next = { weekAnchorDate: ny.startOfWeek(nextDay).toDate(), selectedDate: nextDay };
        setNav(next);
        setMonthAnchorDate(moment(nextDay).startOf("month").toDate());
        scrollToDate(nextDay);
    };

    const shiftWeek = (direction: 1 | -1) => {
        const nextWeekAnchor = ny.addWeeks(nav.weekAnchorDate, direction).toDate();
        const selectedDow = moment(nav.selectedDate).tz(TZ).day();
        const nextSelected = ny.addDays(nextWeekAnchor, selectedDow).toDate();
        const next = { weekAnchorDate: nextWeekAnchor, selectedDate: nextSelected };
        setNav(next);
        setMonthAnchorDate(moment(nextWeekAnchor).startOf("month").toDate());
        scrollToDate(nextSelected);
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
        const next = { weekAnchorDate: ny.startOfWeek(today).toDate(), selectedDate: today };
        setNav(next);
        setMonthAnchorDate(moment(today).startOf("month").toDate());
        scrollToDate(today);
    };

    const openMonthModal = (day?: Date) => {
        const anchor = day ?? nav.selectedDate;
        setMonthAnchorDate(moment(anchor).startOf("month").toDate());
        setIsMonthModalOpen(true);
    };
    const closeMonthModal = () => setIsMonthModalOpen(false);

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
        goToPrevWeek();
        triggerDateToast();
    };

    const handleStripSwipeNextDay = () => {
        goToNextWeek();
        triggerDateToast();
    };

    const handleStripLongPress = (day: Date) => {
        openMonthModal(day);
    };

    const toastTranslateY = toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 0],
    });
    const toastScale = toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
    });

    return (
        <LinearGradient
            colors={eventListColors}
            locations={eventListConfig.locations}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.screenGradient}
        >
            <View pointerEvents="none" style={styles.screenGlowTop} />
            <View pointerEvents="none" style={styles.screenGlowMid} />
            <View pointerEvents="none" style={styles.screenGlowBottom} />
            <View style={styles.container}>
            <PopupManager />
            <EventListViewIntroModal
                visible={showListViewIntro}
                onSwitchToClassic={handleIntroSwitchToClassic}
                onKeepNew={handleIntroKeepNew}
            />

            <FiltersView
                onApply={(f) => {
                    logEvent(UE.EventCalendarViewFiltersSet, { ...analyticsPropsPlusEntity, filters: f });
                    setFilters(f);
                    setFiltersVisible(false);
                }}
                initialFilters={filters}
                visible={filtersVisible}
                onClose={() => setFiltersVisible(false)}
                filterOptions={allClassifications}
            />

            <View style={styles.headerSurface}>
                <TopBar
                    searchQuery={searchQuery}
                    setSearchQuery={(q) => {
                        logEvent(UE.EventCalendarViewSearchChanged, { ...analyticsPropsPlusEntity, search_text: q });
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
                    onPressQuickFilterMore={() => setFiltersVisible(true)}
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
                    onSwipePrevDay={handleStripSwipePrevDay}
                    onSwipeNextDay={handleStripSwipeNextDay}
                    onLongPress={handleStripLongPress}
                    containerWidth={Math.max(0, windowWidth - spacing.lg * 2)}
                />
                <View style={styles.headerDivider} />
            </View>

            <Modal
                transparent
                animationType="fade"
                visible={isMonthModalOpen}
                onRequestClose={closeMonthModal}
            >
                <View style={styles.monthModalBackdrop}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMonthModal} />
                    <View style={[styles.monthModalCard, { width: monthModalWidth }]}>
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
                            onPress={() => onSelectDay(moment().tz(TZ).toDate())}
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
                    </View>
                </View>
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
                />
            </View>
            </View>
        </LinearGradient>
    );
};

export default EventCalendarView;

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
