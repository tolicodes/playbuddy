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

export const getAvailableGroups = (events: Event[]): OptionType[] => {
    return events.reduce((acc, event, index) => {
        if (!event.source_origination_group_name) return acc;

        const existingGroup = acc.find((group) => group.value === event.source_origination_group_name);

        if (existingGroup) {
            existingGroup.count += 1;
        } else {
            acc.push({
                label: event.source_origination_group_name,
                value: event.source_origination_group_name,
                color: colors[acc.length % colors.length],
                count: 1,
            });
        }

        return acc;
    }, [] as (OptionType)[]);
}

const fillInMissingData = (events: Event[]): Event[] => {
    return events.map((event) => {
        return {
            ...event,
            organizer: event.organizer || 'Unknown',
            source_origination_group_name: event.source_origination_group_name || 'Unknown',
            source_origination_group_id: event.source_origination_group_id || 'Unknown',
            source_origination_platform: event.source_origination_platform || 'Unknown',
            source_ticketing_platform: event.source_ticketing_platform || 'Unknown',
            url: event.url || 'Unknown',
            timestamp_scraped: event.timestamp_scraped || 0,
        };
    });
}

export const getEvents = (): Event[] => {
    return fillInMissingData(events as Event[]);
}

export const getWhatsappEvents = () => {
    return fillInMissingData(whatsappEvents);
}


const getEndDateAdjusted = (start_date: string, end_date: string) => {
    const startDate = new Date(start_date);
    let endDate = new Date(end_date);

    // Create a new Date object for start_date's midnight and next day's midnight
    const startMidnight = new Date(startDate);
    startMidnight.setHours(0, 0, 0, 0);

    const nextDayMidnight = new Date(startMidnight);
    nextDayMidnight.setDate(nextDayMidnight.getDate() + 1);

    console.log({
        endDate,
        nextDayMidnight
    })

    if (endDate > nextDayMidnight) {
        endDate = new Date(startDate);
        // Set end_date to the last moment of the previous day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);
    }

    return endDate;
}

// the mapEvents function takes an array of events and an organizerColorsMap and returns an array of events that are formatted for the FullCalendar component
export const mapEventsToFullCalendar = (events: Event[], organizers: OptionType[]) => {
    const mappedEvents = events
        .filter((event) => event.organizer)
        .map((event) => {
            // if the end date is tomorrow, we end at midnight, otherwise we end at 11:59pm
            const endDateAdjusted = getEndDateAdjusted(event.start_date, event.end_date);

            return {
                color: organizers.find((organizer) => organizer.value === event.organizer)?.color,
                id: event.id,
                title: event.name,
                start: event.start_date,
                end: endDateAdjusted,
                extendedProps: {
                    ...event
                }
            };
        });

    return mappedEvents;
};

function createSourceString(props: any) {
    const {
        timestamp_scraped,
        source_origination_group_id,
        source_origination_group_name,
        source_origination_platform,
        source_ticketing_platform,
        dataset
    } = props;

    let result = '';

    if (source_origination_platform) {
        result += `Origination Platform: ${source_origination_platform},`;
    }

    if (source_origination_group_name) {
        result += ` Group Name: ${source_origination_group_name},`;
    }

    if (source_origination_group_id) {
        result += ` Group ID: ${source_origination_group_id},`;
    }

    if (source_ticketing_platform) {
        result += ` Ticketing Platform: ${source_ticketing_platform},`;
    }

    if (timestamp_scraped) {
        const date = new Date(timestamp_scraped);
        result += ` Timestamp Scraped: ${date.toISOString()},`;
    }

    if (dataset) {
        result += ` Dataset: ${dataset},`;
    }

    // Remove the trailing comma if it exists
    result = result.trim().replace(/,$/, '');

    return result;
}


// the getTooltipContent function takes a tippy props object and an event object and returns a string that represents the content of the tooltip
export const getTooltipContent = (props: any, event: any) => {
    return `
    <div style="width:300px; max-height: 300px; overflow-y: auto;">
      <img src="${props.imageUrl}" alt="${event.title}" style="width: 100%; height: auto;"/>
      <h3> <a style="color: white" href="${props.eventUrl}" target="_blank">${event.title}</a></h3>
      <p><a style="$e="color: white" hre{props.organizerUrl}" target="_blank">${props.organizer}</a></p>
      ${props.start_date && new Date(props.start_date).toLocaleString()}
      ${props.end_date && '- ' + new Date(props.end_date).toLocaleString()} (${props.timezone})
      <p><strong>Location:</strong> ${props.location}</p>
      ${props.price && `<p><strong>Price:</strong> ${props.price} ${props.min_ticket_price && `(${props.min_ticket_price} - ${props.max_ticket_price})`}</p>`}
      <p>${props.summary}</p>
      <p><strong>Tags:</strong> ${props.tags && props.tags.join(', ')}</p>
      <p><strong>Source:</strong> ${createSourceString(props)}</p>
    </div>
  `;
};
