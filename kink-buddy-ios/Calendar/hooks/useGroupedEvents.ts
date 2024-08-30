import { useMemo } from 'react';
import moment from 'moment';
import { Event } from '../../commonTypes';

export const useGroupedEvents = (filteredEvents: Event[]) => {
    const groupedEvents = useMemo(() => Array.isArray(filteredEvents) ? filteredEvents.reduce((acc: Record<string, Event[]>, event) => {
        const date = moment(event.start_date).format('YYYY-MM-DD');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {}) : {}, [filteredEvents]);

    const sections = useMemo(() => Object.keys(groupedEvents).map(date => ({
        title: moment(date).format('MMM D, YYYY'),
        data: groupedEvents[date],
    })), [groupedEvents]);

    const markedDates = useMemo(() => {
        return Object.keys(groupedEvents).reduce((acc: any, date) => {
            acc[date] = { marked: true, dotColor: 'blue' };
            return acc;
        }, {});
    }, [groupedEvents]);

    return { groupedEvents, sections, markedDates };
};
