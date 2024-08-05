import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse'
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list'; // Import the list plugin

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling


import { Event } from "../Common/types";
import { EventFilters } from './EventFilters';
import { getAvailableOrganizers, getEvents, getTooltipContent, mapEventsToFullCalendar, OrganizerMeta } from './calendarUtils';
import { Button } from '@mui/material';


const downloadCsv = (data: string) => {
    if (!data) return;

    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const jsonToCsv = (json: any): string => {
    return Papa.unparse(json);
};

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

    // Determine the initial view based on screen size
    const initialView = useMemo(() => {
        return window.matchMedia('(max-width: 767px)').matches ? 'listMonth' : 'dayGridMonth';
    }, []);

    const onClickDownsloadCSV = () => {
        const csvData = jsonToCsv(events);
        downloadCsv(csvData);
    }

    return (
        <>
            {/* We pass currentView events because the EventFilters will do the filtering */}
            <EventFilters onFilterOrganizers={onFilterOrganizers} organizers={currentViewOrganizers} />
            <Button
                variant="contained"
                color="primary"
                onClick={onClickDownsloadCSV}>Download CSV</Button>
            <FullCalendar
                ref={calendarRef}
                datesSet={(arg) => {
                    setCurrentViewStart(arg.start);
                    setCurrentViewEnd(arg.end);
                }}
                plugins={[dayGridPlugin, listPlugin]}
                initialView={initialView}
                views={{
                    listMonth: {
                        buttonText: 'Agenda'
                    }
                }}
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
