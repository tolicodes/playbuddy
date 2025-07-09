import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    SectionList,
    Linking
} from 'react-native';
import moment from 'moment-timezone';
import { startOfWeek, addDays, subWeeks, addWeeks, subDays } from 'date-fns';

import { useCalendarContext } from '../hooks/CalendarContext';
import { useGroupedEvents } from '../hooks/useGroupedEvents';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { FiltersSheet, FilterState } from '../Filters/FiltersSheet';
import EventList from '../EventList';
import WebsiteBanner from '../../../Common/WebsiteBanner';
import { logEvent } from '../../../Common/hooks/logger';
import { MISC_URLS } from '../../../config';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { FeedbackInviteModal } from '../../FeedbackInviteModal';
import { TopBar } from './TopBar';
import { MonthHeader } from './MonthHeader';
import { WeekStrip } from './WeekStrip';
import { FullCalendar } from './FullCalendar';
import { SECTION_DATE_FORMAT } from '../hooks/useGroupedEventsMain';
import { getAllClassificationsFromEvents } from '../../../utils/getAllClassificationsFromEvents';

const WEEK_HEIGHT = 55;
const MONTH_HEIGHT = 300;

interface EventCalendarViewProps {
    events?: EventWithMetadata[];
    showGoogleCalendar?: boolean;

    featuredEvents?: EventWithMetadata[];
}

const EventCalendarView: React.FC<EventCalendarViewProps> = ({ events, showGoogleCalendar = false, featuredEvents }) => {
    const { isLoadingEvents } = useCalendarContext();
    const { authUserId } = useUserContext();

    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        tags: [],
        event_types: [],
        experience_levels: [],
        interactivity_levels: [],
    });


    const allClassifications = useMemo(() => {
        if (!events) return {
            tags: [],
            experience_levels: [],
            interactivity_levels: [],
            event_types: []
        }
        return getAllClassificationsFromEvents(events);
    }, [events]);


    const sectionListRef = useRef<SectionList>(null);
    const animatedHeight = useRef(new Animated.Value(WEEK_HEIGHT)).current;

    const filteredEvents = useMemo(() => {
        if (!events) return [];

        const normalize = (str?: string) => str?.toLowerCase().replace(/ /g, '_');

        if (searchQuery.trim().length > 0) {
            const lower = searchQuery.toLowerCase();
            return events.filter(event =>
                event.name.toLowerCase().includes(lower) ||
                event.organizer.name.toLowerCase().includes(lower) ||
                event.description?.toLowerCase().includes(lower) ||
                event.short_description?.toLowerCase().includes(lower) ||
                event.tags?.some(tag => tag.toLowerCase().includes(lower))
            );
        }

        return events.filter(event => {
            // Tags: match directly, no normalization
            const eventTags = event.classification?.tags || [];
            const matchesTags =
                filters.tags.length === 0 ||
                filters.tags.some(tag => eventTags.includes(tag));

            // Experience level: normalize event value only
            const experience_level = normalize(event.classification?.experience_level);
            const matchesExperience =
                filters.experience_levels.length === 0 ||
                filters.experience_levels.includes(experience_level || '');

            // Interactivity level: normalize event value only
            const interactivity_level = normalize(event.classification?.interactivity_level);
            const matchesInteractivity =
                filters.interactivity_levels.length === 0 ||
                filters.interactivity_levels.includes(interactivity_level || '');

            const matchesEventType =
                filters.event_types.length === 0 ||
                filters.event_types.includes('events') ||
                filters.event_types.includes((event.type));

            return matchesTags && matchesExperience && matchesInteractivity && matchesEventType;
        });
    }, [events, searchQuery, filters]);



    const { sections, markedDates } = useGroupedEvents(filteredEvents, featuredEvents);

    const startOfCurrentWeek = useMemo(
        () => startOfWeek(currentDate, { weekStartsOn: 0 }),
        [currentDate]
    );
    const weekDays = useMemo(
        () => Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i)),
        [startOfCurrentWeek]
    );

    const onPressExpand = () => {
        logEvent('event_calendar_view_on_press_expand');
        Animated.timing(animatedHeight, {
            toValue: isCalendarExpanded ? WEEK_HEIGHT : MONTH_HEIGHT,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setIsCalendarExpanded(!isCalendarExpanded);
    };

    const onPressToday = () => {
        logEvent('event_calendar_view_on_press_today');
        setCurrentDate(new Date());
        setSelectedDate(new Date());
        scrollToDate(new Date());
    };

    const onPressGoogleCalendar = () => {
        logEvent('event_calendar_view_on_press_google_calendar', { isOnWishlist, authUserId });
        Linking.openURL(MISC_URLS.addGoogleCalendar());
    };

    const scrollToDate = (date: Date) => {
        const formatted = moment(date).format(SECTION_DATE_FORMAT);
        const sectionIndex = sections.findIndex(section => section.title === formatted);
        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true });
        }
    };

    const onSelectDay = (day: Date) => {
        setSelectedDate(day);
        scrollToDate(day);
    };

    const isSameDayNY = (d1: Date | string, d2: Date | string) =>
        moment(d1).tz('America/New_York').isSame(moment(d2).tz('America/New_York'), 'day');

    const hasEventsOnDay = (day: Date | string) =>
        filteredEvents.some(event => isSameDayNY(event.start_date, day));

    const setAndScrollToDate = (date: Date) => {
        setCurrentDate(date);
        setSelectedDate(date);
        scrollToDate(date);
    };
    const goToPrev = () => {
        let prevDate = isCalendarExpanded
            ? startOfWeek(subWeeks(currentDate, 4), { weekStartsOn: 0 })
            : startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 0 });

        while (!hasEventsOnDay(prevDate) && prevDate >= new Date()) {
            prevDate = subDays(prevDate, 1);
        }

        setAndScrollToDate(prevDate);
    };
    const goToNext = () => {
        let nextDate = isCalendarExpanded
            ? startOfWeek(addWeeks(currentDate, 4), { weekStartsOn: 0 })
            : startOfWeek(addWeeks(currentDate, 1), { weekStartsOn: 0 });

        while (!hasEventsOnDay(nextDate)) {
            nextDate = addDays(nextDate, 1);
        }

        setAndScrollToDate(nextDate);
    };

    const onPressFilters = () => {
        if (filtersEnabled) {
            setFilters({
                tags: [],
                event_types: [],
                experience_levels: [],
                interactivity_levels: [],
            });
            return;
        }
        setFiltersVisible(true);
    };


    console.log('filters', filters)

    const filtersEnabled = useMemo(() => Object.values(filters).some(arr => arr.length > 0), [filters]);

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <FeedbackInviteModal />

            <FiltersSheet
                onApply={(filters: FilterState) => {
                    setFilters(filters);
                    setFiltersVisible(false);
                }}
                initialFilters={filters}
                visible={filtersVisible}
                onClose={() => setFiltersVisible(false)}
                filterOptions={allClassifications}
            />


            <TopBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onPressFilters={onPressFilters}
                onPressToday={onPressToday}
                onPressGoogleCalendar={onPressGoogleCalendar}
                onPressExpand={onPressExpand}
                isCalendarExpanded={isCalendarExpanded}
                showGoogleCalendar={showGoogleCalendar}
                filtersEnabled={filtersEnabled}
            />

            {!isCalendarExpanded && (
                <MonthHeader
                    currentDate={currentDate}
                    goToPrev={goToPrev}
                    goToNext={goToNext}
                />
            )}

            <Animated.View style={[styles.calendarContainer, { height: animatedHeight }]}>
                {isCalendarExpanded ? (
                    <FullCalendar currentDate={currentDate} markedDates={markedDates} onSelectDay={onSelectDay} hasEventsOnDay={hasEventsOnDay} selectedDate={selectedDate} />
                ) : (
                    <WeekStrip
                        weekDays={weekDays}
                        selectedDate={selectedDate}
                        onSelectDay={onSelectDay}
                        hasEventsOnDay={hasEventsOnDay}
                    />
                )}
            </Animated.View>

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




// Main Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F2' },
    calendarContainer: { width: '100%', overflow: 'hidden', backgroundColor: '#fff' },
    eventListContainer: { flex: 1 },
});
