import { useMemo } from 'react';
import moment from 'moment-timezone';
import type { Event } from '../../../commonTypes';
import type { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { TZ } from '../ListView/calendarNavUtils';

export const SECTION_DATE_FORMAT = 'MMM D, YYYY (dddd)';

type Grouped = Record<string, Event[]>;
type MarkedDates = Record<string, { marked: boolean; dotColor: string[] }>;

export const useGroupedEvents = (
    events: EventWithMetadata[],
    featuredEvents?: EventWithMetadata[]
) => {
    const { groupedEvents, sections, markedDates } = useMemo(() => {
        // 1) Sort once globally
        const sorted = (Array.isArray(events) ? events : []).slice().sort((a, b) =>
            a.start_date.localeCompare(b.start_date)
        );

        // 2) Group by YYYY-MM-DD
        const grouped: Grouped = {};
        for (const ev of sorted) {
            const key = moment.tz(ev.start_date, TZ).format('YYYY-MM-DD');
            (grouped[key] ||= []).push(ev);
        }

        // 3) Build sections
        const baseSections = Object.entries(grouped)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([date, data]) => ({
                key: date,
                date,
                title: moment.tz(date, 'YYYY-MM-DD', TZ).format(SECTION_DATE_FORMAT),
                data,
            }));

        const finalSections = featuredEvents?.length
            ? [{ key: 'featured', date: 'Featured', title: 'Featured', data: featuredEvents }, ...baseSections]
            : baseSections;

        // 4) Marked dates (unique organizer colors)
        const marks: MarkedDates = {};
        for (const [date, dayEvents] of Object.entries(grouped)) {
            const dots = Array.from(
                new Set(
                    dayEvents
                        .map((e: EventWithMetadata) => e.organizerColor)
                        .filter((c): c is string => Boolean(c))
                )
            );
            marks[date] = { marked: true, dotColor: dots };
        }

        return { groupedEvents: grouped, sections: finalSections, markedDates: marks };
    }, [events, featuredEvents]);

    return { groupedEvents, sections, markedDates };
};
