import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import events from './all_events.json';
import { useState, useMemo, useEffect } from 'react';
import tippy, { hideAll } from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling


interface Event {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    location: string;
    price: string;
    imageUrl: string;
    organizer: string;
    organizerUrl: string;
    eventUrl: string;
    summary: string;
    tags: string[];
    min_ticket_price: string;
    max_ticket_price: string;
}

type OrganizerColorsMap = {
    [organizer: string]: string
}

const mapEvents = (events: Event[], organizerColorsMap: OrganizerColorsMap) => {
    return events.map((event) => {
        return {
            color: organizerColorsMap[event.organizer],
            id: event.id,
            title: event.name,
            start: event.start_date,
            end: event.end_date,
            url: event.eventUrl,
            extendedProps: {
                ...event
            }
        }
    });
}

type OrganizerAndColor = {
    name: string;
    color: string;
}

type EventFiltersReturn = {
    onFilterOrganizers: (organizers: OrganizerAndColor[]) => void;
}
export const EventFilters = ({ onFilterOrganizers }: EventFiltersReturn) => {
    const organizers = useMemo(() => {
        const organizerSet = [] as OrganizerAndColor[];
        events.forEach((event, index) => {
            if (!organizerSet.some((org) => org.name === event.organizer)) {
                organizerSet.push({
                    name: event.organizer,
                    color: colors[index % colors.length],
                });
            }
        });
        return organizerSet;
    }, [events]);

    const [filterOrganizers, setFilterOrganizers] = useState<OrganizerAndColor[]>([...organizers]);

    useEffect(() => {
        onFilterOrganizers(filterOrganizers);
    }, [])

    return (
        <div>
            {organizers.map((organizer) => (
                <label key={organizer.name} style={{
                    backgroundColor: organizer.color,
                    marginRight: '10px'
                }}>
                    <input
                        type="checkbox"
                        value={organizer.name}
                        checked={filterOrganizers.includes(organizer)}
                        onChange={(e) => {
                            let newFilterOrganizers;
                            if (!filterOrganizers.includes(organizer)) {
                                newFilterOrganizers = [...filterOrganizers, organizer];
                            } else {
                                newFilterOrganizers = filterOrganizers.filter((org) => org !== organizer);
                            }
                            setFilterOrganizers(newFilterOrganizers);
                            onFilterOrganizers(newFilterOrganizers);
                        }}
                    />
                    {organizer.name}
                </label>
            ))}
        </div>
    )

}

const colors = [
    '#7986CB', // Indigo
    '#33B679', // Green
    '#8E24AA', // Purple
    '#E67C73', // Red
    '#F6BF26', // Yellow
    '#F4511E', // Orange
    '#039BE5', // Blue
    '#616161', // Gray
    '#3F51B5', // Indigo (Darker)
    '#0B8043', // Green (Darker)
    '#D50000', // Red (Darker)
    '#F09300', // Orange (Lighter)
    '#F6BF26', // Yellow (Lighter)
    '#33B679', // Green (Lighter)
    '#0B8043', // Green (Lighter)
    '#E4C441', // Yellow (Softer)
    '#FF7043', // Deep Orange
    '#795548', // Brown
    '#8D6E63', // Brown (Lighter)
    '#9E9E9E', // Gray (Lighter)
];


export const EventCalendar = () => {
    const [filterOrganizers, setFilterOrganizers] = useState<OrganizerAndColor[]>([]);

    const filteredEvents = useMemo(() => events.filter((event) => {
        return filterOrganizers.map((org) => org.name).includes(event.organizer);
    }), [filterOrganizers]);

    const organizerColorsMap = useMemo(() => {
        return filterOrganizers.reduce((acc, organizer, index) => {
            acc[organizer.name] = colors[index % colors.length];
            return acc;
        }, {} as OrganizerColorsMap)
    }, [filterOrganizers]);


    return (
        <>
            <EventFilters onFilterOrganizers={setFilterOrganizers} />
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={mapEvents(filteredEvents, organizerColorsMap)}
                eventMouseEnter={function (info) {
                    const event = info.event;
                    const props = event.extendedProps;

                    // Format the tooltip content
                    const content = `
                      <div style="width:300px">
                        <img src="${props.imageUrl}" alt="${event.title}" style="width: 100%; height: auto;"/>
                        <h3> <a style="color: white" href="${props.eventUrl}" target="_blank">${event.title}</a></h3>
                        <p><a style="color: white"  href="${props.organizerUrl}" target="_blank">${props.organizer}</a></p>
                        ${event.start && new Date(event.start).toLocaleString()}
                        ${event.end && '-' + new Date(event.end).toLocaleString()} (${props.timezone})
                        <p><strong>Location:</strong> ${props.location}</p>
                        <p><strong>Price:</strong> ${props.price} (${props.min_ticket_price} - ${props.max_ticket_price})</p>
                        <p>${props.summary}</p>
                        <p><strong>Tags:</strong> ${props.tags && props.tags.join(', ')}</p>                        
                      </div>
                    `;

                    hideAll(); // Hide all other tooltips

                    // Create a tooltip using tippy.js
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

    )
}