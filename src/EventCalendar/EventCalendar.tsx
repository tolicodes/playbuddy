import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import { Button } from '@mui/material';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { Event, OptionType } from "../Common/types";
import { EventFilters } from './EventFilters';
import {
    downloadCsv,
    getAvailableGroups,
    // getAvailableGroups, 
    getAvailableOrganizers, getEvents, getTooltipContent, jsonToCsv, mapEventsToFullCalendar
} from './calendarUtils';

export const EventCalendar = ({ type }: { type?: 'Whatsapp' }) => {
    const [events, setEvents] = useState<Event[]>([]);
    useEffect(() => {
        console.log('Fetching events');
        getEvents().then((events) => {
            setEvents(events);
        });
    }, []);

    const calendarRef = useRef<FullCalendar>(null);

    const [currentViewStart, setCurrentViewStart] = useState<Date | null>(null);
    const [currentViewEnd, setCurrentViewEnd] = useState<Date | null>(null);

    useEffect(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            setCurrentViewStart(calendarApi.view.activeStart);
            setCurrentViewEnd(calendarApi.view.activeEnd);
        }
    }, []);

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

    const currentViewOrganizers = useMemo(() => getAvailableOrganizers(currentViewEvents), [currentViewEvents]);
    const [filteredOrganizers, setFilteredOrganizers] = useState<OptionType[]>(currentViewOrganizers);
    const onFilterOrganizers = useCallback((organizers: OptionType[]) => {
        setFilteredOrganizers(organizers);
    }, []);

    const currentViewGroups = useMemo(() => getAvailableGroups(currentViewEvents), [currentViewEvents]);
    const [filteredGroups, setFilteredGroups] = useState<OptionType[]>(currentViewGroups);
    const onFilterGroups = useCallback((groups: OptionType[]) => {
        setFilteredGroups(groups);
    }, []);


    const filteredEvents: Event[] = useMemo(() => {
        const organizers = filteredOrganizers.length === 0 ? currentViewOrganizers : filteredOrganizers;
        const groups = filteredGroups.length === 0 ? currentViewGroups : filteredGroups;

        return currentViewEvents.filter((event) => {
            return organizers.map((org) => org.value).includes(event.organizer || '')
                && groups.map((group) => group.value).includes(event.source_origination_group_name || '');
        });
    }, [filteredOrganizers, currentViewEvents, currentViewOrganizers, currentViewGroups, filteredGroups]);


    const initialView = useMemo(() => {
        return window.matchMedia('(max-width: 767px)').matches ? 'listMonth' : 'dayGridMonth';
    }, []);

    const onClickDownloadCSV = () => {
        const csvData = jsonToCsv(events);
        downloadCsv(csvData);
    }

    const onClickGoogleCal = () => {
        const icsUrl = 'http://api.kinkbuddy.org/events?format=ical';
        const encodedUrl = encodeURIComponent(icsUrl);
        const googleCalendarLink = `https://www.google.com/calendar/render?cid=${encodedUrl}`;

        window.location.href = googleCalendarLink;
    }

    return (
        <>
            <EventFilters onFilterChange={onFilterOrganizers} options={currentViewOrganizers} entityName="organizers" />
            {
                type === 'Whatsapp' && <EventFilters onFilterChange={onFilterGroups} options={currentViewGroups} entityName="groups" />

            }
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <Button
                    variant="contained"
                    color="primary"
                    style={{ width: '100%', marginRight: '10px' }}

                    onClick={onClickDownloadCSV}
                >
                    Download CSV
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    style={{ width: '100%' }}

                    onClick={onClickGoogleCal}
                >
                    Google Cal
                </Button>
            </div>

            <div style={{ flex: 1, padding: '10px' }}>
                <FullCalendar
                    ref={calendarRef}
                    height="100%"
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
                    eventDidMount={(info) => {
                        const event = info.event;
                        const props = event.extendedProps;

                        const content = getTooltipContent(props, event);

                        tippy(info.el, {
                            delay: 100,
                            content: content,
                            allowHTML: true,
                            placement: 'auto',
                            arrow: true,
                            theme: 'light',
                            interactive: true,
                        });
                    }}

                />
            </div>
        </>
    );
};
