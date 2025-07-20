import React from 'react';
import type { Event, Munch } from '../../commonTypes';
import EventCalendarView from '../Calendar/ListView/EventCalendarView';

interface Props {
    munch: Munch;
    events: Event[];
}

export const MunchDetailsEventsTab = ({ munch, events }: Props) => {
    const filteredEvents = events.filter(e => e.munch_id === munch.id);

    return (
        <EventCalendarView events={filteredEvents} entity="munch" entityId={munch.id.toString()} />
    );
};
