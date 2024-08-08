import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import { Button } from '@mui/material';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { Event, OptionType } from "../Common/types";
import { EventFilters } from './EventFilters';
import { getAvailableOrganizers, getEvents, getTooltipContent, getWhatsappEvents, mapEventsToFullCalendar } from './calendarUtils';

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

export const EventCalendar = ({ type }: { type?: 'Whatsapp' }) => {
    const events = useMemo(() => type === 'Whatsapp' ? getWhatsappEvents() : getEvents(), [type]);

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

    const filteredEvents: Event[] = useMemo(() => {
        const organizers = filteredOrganizers.length === 0 ? currentViewOrganizers : filteredOrganizers;
        return currentViewEvents.filter((event) => {
            return organizers.map((org) => org.value).includes(event.organizer || '');
        });
    }, [filteredOrganizers, currentViewEvents, currentViewOrganizers]);

    const initialView = useMemo(() => {
        return window.matchMedia('(max-width: 767px)').matches ? 'listMonth' : 'dayGridMonth';
    }, []);

    const onClickDownloadCSV = () => {
        const csvData = jsonToCsv(events);
        downloadCsv(csvData);
    }

    const onClickGoogleCal = () => {
        const icsUrl = 'http://kinks.toli.love/calendar.ics';
        const encodedUrl = encodeURIComponent(icsUrl);
        const googleCalendarLink = `https://www.google.com/calendar/render?cid=${encodedUrl}`;

        window.location.href = googleCalendarLink;
    }

    return (
        <>
            <EventFilters onFilterChange={onFilterOrganizers} options={currentViewOrganizers} />
            {
                // type === 'Whatsapp' && <EventFilters onFilterChange={onFilterGroups} options={currentViewGroups} />

            }
            <Button
                variant="contained"
                color="primary"
                onClick={onClickDownloadCSV}
            >
                Download CSV
            </Button>
            <Button
                variant="contained"
                color="primary"
                onClick={onClickGoogleCal}
            >
                Google Cal
            </Button>

            <div style={{ height: '100vh' }}>
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
                    height="100%"
                    events={mapEventsToFullCalendar(filteredEvents, currentViewOrganizers)}
                    eventMouseEnter={(info) => {
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
