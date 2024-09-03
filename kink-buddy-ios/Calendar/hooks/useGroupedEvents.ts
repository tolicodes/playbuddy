import { useMemo } from 'react';
import moment from 'moment';
import { Event } from '../../commonTypes';
import { EventWithMetadata } from '../CalendarContext';

export const SECTION_DATE_FORMAT = 'MMM D, YYYY (dddd)';

// Custom hook to group filtered events by date, create sections for rendering, 
// and generate marked dates with organizer dots for the calendar.
export const useGroupedEvents = (filteredEvents: EventWithMetadata[]) => {
    // Sections is the list of events grouped by date
    const groupedEvents = useMemo(() => {
        if (!Array.isArray(filteredEvents)) return {};

        return filteredEvents.reduce((acc: Record<string, Event[]>, event) => {
            const date = moment(event.start_date).format('YYYY-MM-DD'); // Format date to 'YYYY-MM-DD'
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(event); // Add event to the corresponding date group
            return acc;
        }, {});
    }, [filteredEvents]);

    // Convert grouped events into sections for SectionList
    const sections = useMemo(() => {
        return Object.keys(groupedEvents).map(date => ({
            title: moment(date).format(SECTION_DATE_FORMAT), // Format the date for display
            data: groupedEvents[date], // Events for that date
        }));
    }, [groupedEvents]);

    // Create marked dates with dot colors for the calendar
    const markedDates = useMemo(() => {
        return Object.entries(groupedEvents).reduce((acc: Record<string, { marked: boolean; dotColor: string[] }>, [date, events]) => {
            // Extract dot colors for each event's organizer and filter out undefined values
            // Should already be deduplicated and sorted by event count
            const dots = events
                .map((event: EventWithMetadata) => event.organizerDotColor)
                // some might not have a color, don't show them
                .filter((color: string | undefined) => !!color);

            // Assign marked date with the corresponding dot colors
            acc[date] = acc[date] || { marked: true, dotColor: dots };
            return acc;
        }, {});
    }, [groupedEvents]);

    return { groupedEvents, sections, markedDates };
};
