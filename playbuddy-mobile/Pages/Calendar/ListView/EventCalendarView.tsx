import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, SectionList, Linking, Text } from "react-native";
import moment from "moment-timezone";

import { useCalendarContext } from "../hooks/CalendarContext";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { FiltersView, FilterState } from "./Filters/FiltersView";
import EventList from "./EventList";
import WebsiteBanner from "../../../components/WebsiteBanner";
import { logEvent } from "../../../Common/hooks/logger";
import { MISC_URLS } from "../../../config";
import { EventWithMetadata } from "../../../Common/Nav/NavStackType";
import { EdgePlayGroupModal } from "../../EdgePlayGroupModal";
import { TopBar } from "./TopBar";
import { DateStripHeader } from "./DateStripHeader";
import { WeekStrip } from "./WeekStrip";
import { SECTION_DATE_FORMAT } from "../hooks/useGroupedEventsMain";
import { getAllClassificationsFromEvents } from "../../../utils/getAllClassificationsFromEvents";
import { UE } from "../../../userEventTypes";
import { useEventAnalyticsProps } from "../../../Common/hooks/useAnalytics";

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
        | { type: 'tag'; tag: string };

    const [quickFilter, setQuickFilter] = useState<QuickFilterSelection | null>(null);

    const allClassifications = useMemo(() => {
        if (!events)
            return { tags: [], experience_levels: [], interactivity_levels: [], event_types: [] };
        return getAllClassificationsFromEvents(events);
    }, [events]);

    const analyticsProps = useEventAnalyticsProps();
    const analyticsPropsPlusEntity = { ...analyticsProps, entity, entityId };

    const sectionListRef = useRef<SectionList>(null);

    const eventHasTag = (event: EventWithMetadata, tag: string) => {
        const target = tag.toLowerCase();
        const combinedTags = [...(event.tags || []), ...(event.classification?.tags || [])];
        return combinedTags.some((t) => t.toLowerCase().includes(target));
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
        return eventHasTag(event, quickFilter.tag);
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

    const quickFilters = useMemo(
        () => [
            { id: 'category:munches', label: 'Munches' },
            { id: 'category:play_parties', label: 'Play Parties' },
            { id: 'category:rope', label: 'Rope' },
            ...quickTagChips.map((tag) => ({ id: `tag:${tag}`, label: tag })),
        ],
        [quickTagChips]
    );

    const filteredEvents = useMemo(() => {
        if (!events) return [];
        const normalize = (str?: string) => str?.toLowerCase().replace(/ /g, "_");
        const baseEvents = quickFilter ? events.filter(matchesQuickFilter) : events;

        if (searchQuery.trim().length > 0) {
            const lower = searchQuery.toLowerCase();
            return baseEvents.filter(
                (event) =>
                    event.name.toLowerCase().includes(lower) ||
                    event.organizer.name.toLowerCase().includes(lower) ||
                    event.description?.toLowerCase().includes(lower) ||
                    event.short_description?.toLowerCase().includes(lower) ||
                    event.tags?.some((tag) => tag.toLowerCase().includes(lower))
            );
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
            : `tag:${quickFilter.tag}`
        : null;

    const tagSuggestions = useMemo(() => {
        const seen = new Set<string>();
        const suggestions: string[] = [];

        for (const tag of allClassifications.tags || []) {
            const name = tag.name.trim();
            const key = name.toLowerCase();
            if (!name || seen.has(key)) continue;
            seen.add(key);
            suggestions.push(name);
        }

        for (const event of events || []) {
            for (const tag of event.tags || []) {
                const name = tag.trim();
                const key = name.toLowerCase();
                if (!name || seen.has(key)) continue;
                seen.add(key);
                suggestions.push(name);
            }
        }

        return suggestions;
    }, [allClassifications.tags, events]);

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
            <EdgePlayGroupModal />

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
                selectedQuickFilterId={selectedQuickFilterId}
                onSelectQuickFilter={(filterId) => {
                    if (filterId === selectedQuickFilterId) {
                        setQuickFilter(null);
                        return;
                    }
                    if (filterId.startsWith('category:')) {
                        const key = filterId.replace('category:', '') as QuickFilterCategory;
                        setQuickFilter({ type: 'category', key });
                        return;
                    }
                    if (filterId.startsWith('tag:')) {
                        const tag = filterId.replace('tag:', '');
                        setQuickFilter({ type: 'tag', tag });
                    }
                }}
                onPressQuickFilterMore={() => setFiltersVisible(true)}
                tagSuggestions={tagSuggestions}
                onSelectTagSuggestion={(tag) => {
                    setFilters((prev) => {
                        if (prev.tags.includes(tag)) return prev;
                        return { ...prev, tags: [...prev.tags, tag] };
                    });
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

            {isCalendarExpanded ? (
                <FullCalendar
                    currentDate={monthAnchorDate}
                    onSelectDay={onSelectDay}
                    hasEventsOnDay={hasEventsOnDay}
                    selectedDate={nav.selectedDate}
                />
            ) : (
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

            <View style={styles.eventListContainer}>
                <EventList
                    sections={sections}
                    sectionListRef={sectionListRef}
                    isLoadingEvents={isLoadingEvents}
                />
            </View>
        </View>
    );
};

export default EventCalendarView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    calendarContainer: { width: "100%", backgroundColor: "transparent" },
    eventListContainer: { flex: 1 },
});
