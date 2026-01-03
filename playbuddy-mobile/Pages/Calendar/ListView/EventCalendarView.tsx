import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, SectionList, Linking } from "react-native";
import moment from "moment-timezone";
import { LinearGradient } from "expo-linear-gradient";

import { useCalendarContext } from "../hooks/CalendarContext";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { FiltersView, FilterState } from "./Filters/FiltersView";
import EventList from "./EventList";
import WebsiteBanner from "../../../components/WebsiteBanner";
import { logEvent } from "../../../Common/hooks/logger";
import { MISC_URLS } from "../../../config";
import { EventWithMetadata } from "../../../Common/Nav/NavStackType";
import { PopupManager } from "../../PopupManager";
import { TopBar, ChipTone, QuickFilterItem, TypeaheadSuggestion, ActiveFilterChip } from "./TopBar";
import { DateStripHeader } from "./DateStripHeader";
import { WeekStrip } from "./WeekStrip";
import { SECTION_DATE_FORMAT } from "../hooks/useGroupedEventsMain";
import { getAllClassificationsFromEvents } from "../../../utils/getAllClassificationsFromEvents";
import { UE } from "../../../userEventTypes";
import { useEventAnalyticsProps } from "../../../Common/hooks/useAnalytics";
import { radius, spacing } from "../../../components/styles";

import {
    TZ,
    NavState,
    ny,
    hasEventsOnOrAfterTodayNY,
    computeInitialState,
    deriveWeekArrays,
    goToPrevWeekNav,
    goToNextWeekNav,
    goToTodayNav,
    canGoPrev as canGoPrevWeek,
} from "./calendarNavUtils";
import { FullCalendar } from "./FullCalendar";

interface Props {
    events?: EventWithMetadata[];
    showGoogleCalendar?: boolean;
    entity?: string;
    featuredEvents?: EventWithMetadata[];
    entityId?: string;
}

const EventCalendarView: React.FC<Props> = ({
    events,
    showGoogleCalendar = false,
    featuredEvents,
    entity = "events",
    entityId,
}) => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const { isLoadingEvents } = useCalendarContext();
    const { authUserId } = useUserContext();

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

    const allClassifications = useMemo(() => {
        if (!events)
            return { tags: [], experience_levels: [], interactivity_levels: [], event_types: [] };
        return getAllClassificationsFromEvents(events);
    }, [events]);

    const analyticsProps = useEventAnalyticsProps();
    const analyticsPropsPlusEntity = { ...analyticsProps, entity, entityId };

    const eventListTheme = 'aurora' as const;
    const eventListThemes = {
        aurora: {
            colors: ['rgba(122,74,215,0.22)', '#F7F2FF', '#FCEAF2', '#FFF1D6'],
            locations: [0, 0.2, 0.62, 1],
            glows: ['rgba(128,90,255,0.16)', 'rgba(255,120,180,0.14)', 'rgba(255,210,140,0.18)'],
            blend: 'rgba(122,74,215,0.2)',
        },
        velvet: {
            colors: ['rgba(98,68,190,0.2)', '#F0EBFF', '#EFE6FF', '#F7EAF8'],
            locations: [0, 0.22, 0.58, 1],
            glows: ['rgba(90,67,181,0.16)', 'rgba(144,97,255,0.14)', 'rgba(255,162,210,0.14)'],
            blend: 'rgba(98,68,190,0.18)',
        },
        citrus: {
            colors: ['rgba(255,178,102,0.18)', '#FFF3E2', '#FFE7F1', '#F3F2FF'],
            locations: [0, 0.24, 0.6, 1],
            glows: ['rgba(255,186,128,0.18)', 'rgba(255,124,146,0.14)', 'rgba(120,150,255,0.12)'],
            blend: 'rgba(255,178,102,0.16)',
        },
    };
    const eventListConfig = eventListThemes[eventListTheme];
    const eventListColors = eventListConfig.colors;

    const sectionListRef = useRef<SectionList>(null);

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

    const chipTones: Record<string, ChipTone> = {
        'play party': { background: '#EFE9FF', text: '#5A43B5', border: '#DED7FF' },
        'munch': { background: '#FFE2B6', text: '#8A5200', border: '#F1C07A' },
        'retreat': { background: '#EAF6EE', text: '#2E6B4D', border: '#D6EBDC' },
        'festival': { background: '#E8F1FF', text: '#2F5DA8', border: '#D6E4FB' },
        'workshop': { background: '#FDEBEC', text: '#9A3D42', border: '#F6D7DA' },
        'performance': { background: '#F1E9FF', text: '#5D3FA3', border: '#E2D6FB' },
        'discussion': { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
        'rope': { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
    };
    const organizerTone: ChipTone = {
        background: '#E8F1FF',
        text: '#2F5DA8',
        border: '#D6E4FB',
    };
    const experienceTone: ChipTone = {
        background: '#E7F0FF',
        text: '#2F5DA8',
        border: '#D6E4FB',
    };
    const interactivityTones: Record<string, ChipTone> = {
        social: { background: '#E9FBF3', text: '#1F8A5B', border: '#BDEDD8' },
        discussion: { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
        intimate: { background: '#FFE9F1', text: '#A6456A', border: '#F6CADB' },
        sensual: { background: '#FDEBEC', text: '#9A3D42', border: '#F6D7DA' },
        erotic: { background: '#FDE3E3', text: '#B42318', border: '#F3C8C8' },
        sexual: { background: '#FEE2E2', text: '#B42318', border: '#F6C9C9' },
        extreme: { background: '#FEE2E2', text: '#B42318', border: '#F6C9C9' },
        hands_on: { background: '#E7F9F6', text: '#197769', border: '#CFEFE9' },
        performance: { background: '#F1E9FF', text: '#5D3FA3', border: '#E2D6FB' },
        observational: { background: '#EEF2FF', text: '#4C55A6', border: '#D9DEFF' },
    };
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
        if (!events) return [];
        const normalize = (str?: string) => str?.toLowerCase().replace(/ /g, "_");
        const baseEvents = quickFilter ? events.filter(matchesQuickFilter) : events;

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
    }, [events, searchQuery, filters, quickFilter]);

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
            const selectedStillOk = hasEventsOnOrAfterTodayNY(filteredEvents, prev.selectedDate);
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

    // Treat all days before today as disabled/grey (even if historical events exist)
    const hasEventsOnDay = (d: Date | string) => hasEventsOnOrAfterTodayNY(filteredEvents, d);

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

    const onSelectDay = (day: Date) => {
        if (!hasEventsOnDay(day)) {
            return;
        }
        const next = { weekAnchorDate: ny.startOfWeek(day).toDate(), selectedDate: day };

        setNav(next);
        setMonthAnchorDate(moment(day).startOf("month").toDate());
        scrollToDate(day);
        setIsCalendarExpanded(false);
    };

    const prevDisabled = !isCalendarExpanded && !canGoPrevWeek(nav.weekAnchorDate);

    const shiftMonth = (delta: number) => {
        const nextMonth = moment(monthAnchorDate).add(delta, "month").startOf("month").toDate();
        setMonthAnchorDate(nextMonth);
        const nextNav = { weekAnchorDate: ny.startOfWeek(nextMonth).toDate(), selectedDate: nextMonth };
        setNav(nextNav);
        scrollToDate(nextMonth);
    };

    const goToPrev = () => {
        if (isCalendarExpanded) {
            shiftMonth(-1);
            return;
        }
        if (prevDisabled) return;
        const next = goToPrevWeekNav(nav, filteredEvents);
        if (next !== nav) {
            setNav(next);
            scrollToDate(next.selectedDate);
        }
    };

    const goToNext = () => {
        if (isCalendarExpanded) {
            shiftMonth(1);
            return;
        }
        const next = goToNextWeekNav(nav, filteredEvents);
        setNav(next);
        if (!ny.isSameDay(next.selectedDate, nav.selectedDate)) {
            scrollToDate(next.selectedDate);
        }
    };

    const goToToday = () => {
        const next = goToTodayNav(nav, filteredEvents);
        setNav(next);
        const nextMonth = moment(next.selectedDate).startOf("month").toDate();
        setMonthAnchorDate(nextMonth);
        scrollToDate(next.selectedDate);
    };

    const onPressExpand = () => {
        setIsCalendarExpanded((prev) => {
            const next = !prev;
            if (next) {
                setMonthAnchorDate(moment(nav.selectedDate).startOf("month").toDate());
            }
            return next;
        });
    };

    const headerDate = isCalendarExpanded ? monthAnchorDate : nav.weekAnchorDate;

    return (
            <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <PopupManager />

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

            <DateStripHeader
                currentDate={headerDate}
                goToPrev={goToPrev}
                goToNext={goToNext}
                goToToday={goToToday}
                disabledPrev={prevDisabled}
                showWeekRange={!isCalendarExpanded}
                isExpanded={isCalendarExpanded}
                onToggleExpand={onPressExpand}
            />
            {!isCalendarExpanded && (
                <View style={styles.calendarContainer}>
                    <WeekStrip
                        prevWeekDays={prevWeekDays}
                        weekDays={weekDays}
                        nextWeekDays={nextWeekDays}
                        selectedDay={nav.selectedDate}
                        onChangeSelectedDay={onSelectDay}
                        hasEventsOnDay={hasEventsOnDay}
                        goToPrev={goToPrev}
                        goToNext={goToNext}
                        canGoPrev={!prevDisabled}
                    />
                </View>
            )}

            {isCalendarExpanded && (
                <FullCalendar
                    currentDate={monthAnchorDate}
                    onSelectDay={onSelectDay}
                    hasEventsOnDay={hasEventsOnDay}
                    selectedDate={nav.selectedDate}
                />
            )}

            <LinearGradient
                colors={eventListColors}
                locations={eventListConfig.locations}
                style={styles.eventListContainer}
            >
                <View pointerEvents="none" style={styles.eventListBackdrop}>
                    <LinearGradient
                        colors={[eventListConfig.blend, 'rgba(255,255,255,0)']}
                        style={styles.eventListBlend}
                    />
                    <View style={[styles.eventListGlow, styles.eventListGlowOne, { backgroundColor: eventListConfig.glows[0] }]} />
                    <View style={[styles.eventListGlow, styles.eventListGlowTwo, { backgroundColor: eventListConfig.glows[1] }]} />
                    <View style={[styles.eventListGlow, styles.eventListGlowThree, { backgroundColor: eventListConfig.glows[2] }]} />
                </View>
                <EventList
                    sections={sections}
                    sectionListRef={sectionListRef}
                    isLoadingEvents={isLoadingEvents}
                />
            </LinearGradient>
        </View>
    );
};

export default EventCalendarView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    calendarContainer: { width: "100%", backgroundColor: "transparent" },
    eventListContainer: {
        flex: 1,
        borderTopLeftRadius: radius.hero,
        borderTopRightRadius: radius.hero,
        paddingTop: spacing.sm,
        marginTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: "rgba(122,74,215,0.16)",
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 8,
        elevation: 5,
    },
    eventListBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    eventListGlow: {
        position: 'absolute',
        borderRadius: 200,
    },
    eventListBlend: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    eventListGlowOne: {
        width: 260,
        height: 260,
        left: 20,
        top: 90,
    },
    eventListGlowTwo: {
        width: 220,
        height: 220,
        right: 6,
        top: 190,
    },
    eventListGlowThree: {
        width: 280,
        height: 280,
        left: 50,
        bottom: 60,
    },
});
