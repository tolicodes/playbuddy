import { Event } from "../Common/types";

import events from './all_events.json'
import whatsappEvents from './all_whatsapp_events.json'
import { OptionType } from "../Common/types";

export const colors = [
    '#7986CB', '#33B679', '#8E24AA', '#E67C73', '#F6BF26', '#F4511E', '#039BE5', '#616161',
    '#3F51B5', '#0B8043', '#D50000', '#F09300', '#F6BF26', '#33B679', '#0B8043', '#E4C441',
    '#FF7043', '#795548', '#8D6E63', '#9E9E9E'
];

export const getAvailableOrganizers = (events: Event[]): OptionType[] => {
    return events.reduce((acc, event, index) => {
        if (!event.organizer) return acc;

        const existingOrganizer = acc.find((org) => org.value === event.organizer);

        if (existingOrganizer) {
            existingOrganizer.count += 1;
        } else {
            acc.push({
                label: event.organizer,
                value: event.organizer,
                color: colors[acc.length % colors.length],
                count: 1,
            });
        }

        return acc;
    }, [] as (OptionType)[]);
}

export const getEvents = (): Event[] => {
    return events as Event[];
}

export const getWhatsappEvents = () => {
    return whatsappEvents as Event[];
}


// the mapEvents function takes an array of events and an organizerColorsMap and returns an array of events that are formatted for the FullCalendar component
export const mapEventsToFullCalendar = (events: Event[], organizers: OptionType[]) => {
    const mappedEvents = events
        .filter((event) => event.organizer)
        .map((event) => {
            return {
                color: organizers.find((organizer) => organizer.value === event.organizer)?.color,
                id: event.id,
                title: event.name,
                // TODO: we will only have a start_date field
                start: new Date(`${event.start_date}${event.start_time ? `T${event.start_time}` : ''}`),
                end: new Date(`${event.end_date}${event.end_time ? `T${event.end_time}` : ''}`),
                extendedProps: {
                    ...event
                }
            };
        });

    return mappedEvents;
};

// the getTooltipContent function takes a tippy props object and an event object and returns a string that represents the content of the tooltip
export const getTooltipContent = (props: any, event: any) => {
    return `
    <div style="width:300px; max-height: 300px; overflow-y: auto;">
      <img src="${props.imageUrl}" alt="${event.title}" style="width: 100%; height: auto;"/>
      <h3> <a style="color: white" href="${props.eventUrl}" target="_blank">${event.title}</a></h3>
      <p><a style="$e="color: white" hre{props.organizerUrl}" target="_blank">${props.organizer}</a></p>
      ${event.start && new Date(event.start).toLocaleString()}
      ${event.end && '-' + new Date(event.end).toLocaleString()} (${props.timezone})
      <p><strong>Location:</strong> ${props.location}</p>
      ${props.price && `<p><strong>Price:</strong> ${props.price} ${props.min_ticket_price && `(${props.min_ticket_price} - ${props.max_ticket_price})`}</p>`}
      <p>${props.summary}</p>
      <p><strong>Tags:</strong> ${props.tags && props.tags.join(', ')}</p>
      <p>Source: ${props.source} ${props.referrer_name ? `(${props.referrer_name} - ${props.referrer_source})` : ''}</p>
    </div>
  `;
};
