import { Event } from "../Common/types";

import pluraEventsOriginal from './all_plura_events.json';
import eventbriteEvents from './all_events.json'

export type OrganizerMeta = {
    name: string;
    color: string;
    count: number
};

export const colors = [
    '#7986CB', '#33B679', '#8E24AA', '#E67C73', '#F6BF26', '#F4511E', '#039BE5', '#616161',
    '#3F51B5', '#0B8043', '#D50000', '#F09300', '#F6BF26', '#33B679', '#0B8043', '#E4C441',
    '#FF7043', '#795548', '#8D6E63', '#9E9E9E'
];

export const getAvailableOrganizers = (events: Event[]): OrganizerMeta[] => {
    return events.reduce((acc, event, index) => {
        if (!event.organizer) return acc;

        const existingOrganizer = acc.find((org) => org.name === event.organizer);

        if (existingOrganizer) {
            existingOrganizer.count += 1;
        } else {
            acc.push({
                name: event.organizer,
                color: colors[acc.length % colors.length],
                count: 1,
            });
        }

        return acc;
    }, [] as (OrganizerMeta)[]);
}

export const getEvents = () => {
    // these are default Plura events that we want to exclude from the calendar
    const EXCLUDE_EVENT_IDS = [
        'e7179b3b-b4f8-40df-8d87-f205b0caaeb1', // New York LGBTQ+ Community Events Calendar
        '036f8010-9910-435f-8119-2025a046f452'  // NYC Kink Community Events Calendar
    ];

    const events = [
        ...pluraEventsOriginal.filter((event) => !EXCLUDE_EVENT_IDS.includes(event.id)) as Event[],
        ...eventbriteEvents as Event[]
    ]

    const dedupedEvents = events.reduce((acc: Event[], event) => {
        const existingEvent = acc.find((e) => e.name === event.name);
        if (!existingEvent) {
            acc.push(event);
        }
        return acc;
    }, []);

    return dedupedEvents;
}

// the mapEvents function takes an array of events and an organizerColorsMap and returns an array of events that are formatted for the FullCalendar component
export const mapEventsToFullCalendar = (events: Event[], organizers: OrganizerMeta[]) => {
    return events
        .filter((event) => event.organizer)
        .map((event) => {
            return {
                color: organizers.find((organizer) => organizer.name === event.organizer)?.color,
                id: event.id,
                title: event.name,
                start: event.start_date,
                end: event.end_date,
                // url: event.eventUrl,
                extendedProps: {
                    ...event
                }
            };
        });
};

// the getTooltipContent function takes a tippy props object and an event object and returns a string that represents the content of the tooltip
export const getTooltipContent = (props: any, event: any) => {
    return `
    <div style="width:300px; max-height: 200px; overflow-y: auto;">
      <img src="${props.imageUrl}" alt="${event.title}" style="width: 100%; height: auto;"/>
      <h3> <a style="color: white" href="${props.eventUrl}" target="_blank">${event.title}</a></h3>
      <p><a style="$e="color: white" hre{props.organizerUrl}" target="_blank">${props.organizer}</a></p>
      ${event.start && new Date(event.start).toLocaleString()}
      ${event.end && '-' + new Date(event.end).toLocaleString()} (${props.timezone})
      <p><strong>Location:</strong> ${props.location}</p>
      ${props.price && `<p><strong>Price:</strong> ${props.price} ${props.min_ticket_price && `(${props.min_ticket_price} - ${props.max_ticket_price})`}</p>`}
      <p>${props.summary}</p>
      <p><strong>Tags:</strong> ${props.tags && props.tags.join(', ')}</p>
    </div>
  `;
};
