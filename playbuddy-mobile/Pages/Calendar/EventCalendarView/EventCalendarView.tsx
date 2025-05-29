import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Animated,
    SectionList,
    Linking
} from 'react-native';
import moment from 'moment-timezone';
import { startOfWeek, addDays, subWeeks, addWeeks, subDays } from 'date-fns';

import { useCalendarContext } from '../hooks/CalendarContext';
import { useGroupedEvents, SECTION_DATE_FORMAT } from '../hooks/useGroupedEvents';
import { useUserContext } from '../../Auth/hooks/UserContext';
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

const WEEK_HEIGHT = 55;
const MONTH_HEIGHT = 300;

interface EventCalendarViewProps {
    isOnWishlist?: boolean;
    events?: EventWithMetadata[];
    showGoogleCalendar?: boolean;
}

const EventCalendarView: React.FC<EventCalendarViewProps> = ({ isOnWishlist = false, events, showGoogleCalendar = false }) => {
    const { filters, setFilters, filteredEvents, wishlistEvents, reloadEvents, isLoadingEvents } = useCalendarContext();
    const { authUserId } = useUserContext();

    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const sectionListRef = useRef<SectionList>(null);
    const animatedHeight = useRef(new Animated.Value(WEEK_HEIGHT)).current;

    const eventsUsed = events ?? (isOnWishlist ? wishlistEvents : filteredEvents);
    const [eventsLocalFiltered, setEventsLocalFiltered] = useState<EventWithMetadata[]>(eventsUsed);

    useEffect(() => {
        setEventsLocalFiltered(eventsUsed);
    }, [eventsUsed]);

    const { sections, markedDates } = useGroupedEvents(eventsLocalFiltered);

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
        eventsLocalFiltered.some(event => isSameDayNY(event.start_date, day));

    const goToPrev = () => {
        let prevDate = isCalendarExpanded
            ? startOfWeek(subWeeks(currentDate, 4), { weekStartsOn: 0 })
            : startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 0 });

        while (!hasEventsOnDay(prevDate) && prevDate >= new Date()) {
            prevDate = subDays(prevDate, 1);
        }

        setCurrentDate(prevDate);
        setSelectedDate(prevDate);
        scrollToDate(prevDate);
    };
    const goToNext = () => {
        let nextDate = isCalendarExpanded
            ? startOfWeek(addWeeks(currentDate, 4), { weekStartsOn: 0 })
            : startOfWeek(addWeeks(currentDate, 1), { weekStartsOn: 0 });

        while (!hasEventsOnDay(nextDate)) {
            nextDate = addDays(nextDate, 1);
        }

        setCurrentDate(nextDate);
        setSelectedDate(nextDate);
        scrollToDate(nextDate);
    };

    const debounce = (func: (query: string) => void, delay: number) => {
        let timeout: NodeJS.Timeout;
        return (query: string) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(query), delay);
        };
    };

    const debouncedSetFilters = useCallback(
        debounce(query => {
            setFilters({ ...filters, search: query });
        }, 200),
        [filters]
    );

    useEffect(() => {
        debouncedSetFilters(searchQuery);
    }, [searchQuery]);

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <FeedbackInviteModal />

            <TopBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onPressToday={onPressToday}
                onPressGoogleCalendar={onPressGoogleCalendar}
                onPressExpand={onPressExpand}
                isCalendarExpanded={isCalendarExpanded}
                showGoogleCalendar={showGoogleCalendar}
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
                    reloadEvents={reloadEvents}
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
