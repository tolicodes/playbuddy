import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling


import { Event } from "../Common/types";
import { EventFilters } from './EventFilters';
import { getAvailableOrganizers, getEvents, getTooltipContent, mapEventsToFullCalendar, OrganizerMeta } from './calendarUtils';




export const EventCalendar = () => {
    const events = useMemo(() => getEvents(), []);

    // create a ref to the FullCalendar component
    // for filtering dates
    const calendarRef = useRef<FullCalendar>(null);

    // used to keep track of the current view start and end dates
    // for organizer filters
    const [currentViewStart, setCurrentViewStart] = useState<Date | null>(null);
    const [currentViewEnd, setCurrentViewEnd] = useState<Date | null>(null);

    useEffect(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            setCurrentViewStart(calendarApi.view.activeStart);
            setCurrentViewEnd(calendarApi.view.activeEnd);
        }
    }, []);

    // Filters events based on the current view
    const [currentViewEvents, setCurrentViewEvents] = useState<Event[]>([]);

    useEffect(() => {
        if (!currentViewStart || !currentViewEnd) {
            return;
        }

        const eventsInView = events.filter((event) => {
            const eventStart = new Date(event.start_date);
            return eventStart >= currentViewStart && eventStart <= currentViewEnd;
        });

        setCurrentViewEvents(eventsInView);
    }, [currentViewStart, currentViewEnd, events]);


    // ORGANIZER FILTERING
    // based on EventFilters component
    const currentViewOrganizers = useMemo(() => getAvailableOrganizers(currentViewEvents), [currentViewEvents]);

    const [filteredOrganizers, setFilteredOrganizers] = useState<OrganizerMeta[]>(currentViewOrganizers);

    const onFilterOrganizers = useCallback((organizers: OrganizerMeta[]) => {
        setFilteredOrganizers(organizers)
    }, []);

    // filter events based on the selected organizers
    const filteredEvents: Event[] = useMemo(() => {
        const organizers = filteredOrganizers.length === 0 ? currentViewOrganizers : filteredOrganizers;
        return currentViewEvents.filter((event) => {
            return organizers.map((org) => org.name).includes(event.organizer || '');
        });
    }, [filteredOrganizers, currentViewEvents, currentViewOrganizers]);

    return (
        <>
            {/* We pass currentView events because the EventFilters will do the filtering */}
            <EventFilters onFilterOrganizers={onFilterOrganizers} organizers={currentViewOrganizers} />
            <FullCalendar
                ref={calendarRef}
                datesSet={(arg) => {
                    setCurrentViewStart(arg.start);
                    setCurrentViewEnd(arg.end);
                }}
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={mapEventsToFullCalendar(filteredEvents, currentViewOrganizers)}
                eventMouseEnter={function (info) {
                    const event = info.event;
                    const props = event.extendedProps;

                    const content = getTooltipContent(props, event);

                    tippy(info.el, {
                        delay: 100, // ms
                        content: content,
                        allowHTML: true,
                        placement: 'top',
                        arrow: true,
                        theme: 'light', // Optional: you can use tippy.js themes
                        interactive: true,
                    });
                }}
            />
        </>
    );
};
