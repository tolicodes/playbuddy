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
import { FeedbackInviteModal } from "../../FeedbackInviteModal";
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

    const allClassifications = useMemo(() => {
        if (!events)
            return { tags: [], experience_levels: [], interactivity_levels: [], event_types: [] };
        return getAllClassificationsFromEvents(events);
    }, [events]);

    const analyticsProps = useEventAnalyticsProps();
    const analyticsPropsPlusEntity = { ...analyticsProps, entity, entityId };

    const sectionListRef = useRef<SectionList>(null);

    // Filtered events (unchanged)
    const filteredEvents = useMemo(() => {
        if (!events) return [];
        const normalize = (str?: string) => str?.toLowerCase().replace(/ /g, "_");

        if (searchQuery.trim().length > 0) {
            const lower = searchQuery.toLowerCase();
            return events.filter(
                (event) =>
                    event.name.toLowerCase().includes(lower) ||
                    event.organizer.name.toLowerCase().includes(lower) ||
                    event.description?.toLowerCase().includes(lower) ||
                    event.short_description?.toLowerCase().includes(lower) ||
                    event.tags?.some((tag) => tag.toLowerCase().includes(lower))
            );
        }

        return events.filter((event) => {
            const tags = event.classification?.tags || [];
            const matchesTags = filters.tags.length === 0 || filters.tags.some((t) => tags.includes(t));
            const exp = normalize(event.classification?.experience_level);
            const matchesExp = filters.experience_levels.length === 0 || filters.experience_levels.includes(exp || "");
            const inter = normalize(event.classification?.interactivity_level);
            const matchesInter = filters.interactivity_levels.length === 0 || filters.interactivity_levels.includes(inter || "");
            const matchesType =
                filters.event_types.length === 0 || filters.event_types.includes("events") || filters.event_types.includes(event.type);
            return matchesTags && matchesExp && matchesInter && matchesType;
        });
    }, [events, searchQuery, filters]);

    const { sections } = useGroupedEvents(filteredEvents, featuredEvents);

    // ===== NY-time Navigation State =====
    const [nav, setNav] = useState<NavState>(() => computeInitialState(filteredEvents));

    // Re-sanitize selection when filters change
    useEffect(() => {
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
            return computeInitialState(filteredEvents);
        });
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
        scrollToDate(day);
    };

    const prevDisabled = !canGoPrevWeek(nav.weekAnchorDate);

    const goToPrev = () => {
        if (prevDisabled) {
            return;
        }
        const next = goToPrevWeekNav(nav, filteredEvents);
        if (next !== nav) {
            setNav(next);
            scrollToDate(next.selectedDate);
        }
    };

    const goToNext = () => {
        const next = goToNextWeekNav(nav, filteredEvents);
        setNav(next);
        if (!ny.isSameDay(next.selectedDate, nav.selectedDate)) {
            scrollToDate(next.selectedDate);
        }
    };

    const goToToday = () => {
        const next = goToTodayNav(nav, filteredEvents);
        setNav(next);
        scrollToDate(next.selectedDate);
    };

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <FeedbackInviteModal />

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
                onPressExpand={() => { }}
                isCalendarExpanded={false}
                showGoogleCalendar={showGoogleCalendar}
                filtersEnabled={Object.values(filters).some((a) => a.length > 0)}
            />

            <DateStripHeader
                currentDate={nav.weekAnchorDate}
                goToPrev={goToPrev}
                goToNext={goToNext}
                goToToday={goToToday}
                disabledPrev={prevDisabled}
            />

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
