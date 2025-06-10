import { useMemo } from 'react';
import moment from 'moment';
import { Event } from '../../../commonTypes';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { useCalendarContext } from './CalendarContext';
import { useFetchDeepLinks } from '../../../Common/hooks/useDeepLinks';

export const SECTION_DATE_FORMAT = 'MMM D, YYYY (dddd)';

// Custom hook to group filtered events by date, create sections for rendering, 
// and generate marked dates with organizer dots for the calendar.
export const useGroupedEvents = (events: EventWithMetadata[], featuredEvents?: EventWithMetadata[]) => {
    // Sections is the list of events grouped by date
    const groupedEvents = useMemo(() => {
        if (!Array.isArray(events)) return {};

        return events.reduce((acc: Record<string, Event[]>, event) => {
            const date = moment(event.start_date).format('YYYY-MM-DD'); // Format date to 'YYYY-MM-DD'
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(event); // Add event to the corresponding date group
            return acc;
        }, {});
    }, [events]);

    const sectionsRegular = useMemo(() => {
        return Object.keys(groupedEvents)
            .map(date => ({
                key: date,
                date,
                title: moment(date).format(SECTION_DATE_FORMAT), // Format the date for display
                data: groupedEvents[date], // Events for that date
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
    }, [groupedEvents]);

    let sections;

    if (featuredEvents) {
        const featuredSection = {
            key: 'featured',
            date: 'Featured',
            title: 'Featured',
            data: featuredEvents,
        }
        sections = [featuredSection, ...sectionsRegular];
    } else {
        sections = sectionsRegular;
    }

    // Create marked dates with dot colors for the calendar
    const markedDates = useMemo(() => {
        return Object.entries(groupedEvents).reduce((acc: Record<string, { marked: boolean; dotColor: string[] }>, [date, events]) => {
            // Extract dot colors for each event's organizer and filter out undefined values
            // Should already be deduplicated and sorted by event count
            const dots = Array.from(new Set(
                events
                    .map((event: EventWithMetadata) => event.organizerColor)
                    // some might not have a color, don't show them
                    .filter((color: string | undefined) => !!color)
            ));

            // Assign marked date with the corresponding dot colors
            acc[date] = acc[date] || { marked: true, dotColor: dots };
            return acc;
        }, {});
    }, [groupedEvents]);

    return { groupedEvents, sections, markedDates };
};

export const useFeaturedEvents = () => {
    const { allEvents } = useCalendarContext();

    const { data: deepLinks = [] } = useFetchDeepLinks();

    const featuredEvents = deepLinks
        .filter((dl) => dl.featured_event)
        .map((dl) => dl.featured_event)
        .filter((event, index, self) =>
            index === self.findIndex((e) => e.id === event.id)
        )
        .map((event) => allEvents.find(e => e.id === event.id))
        .filter((event): event is Event => !!event);

    return featuredEvents;
}