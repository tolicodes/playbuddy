import React from 'react'
import EventCalendarView from "../../../Calendar/EventCalendarView";
import { useCalendarContext } from "../../../Calendar/hooks/CalendarContext";
import { getEventPromoCodes } from "../usePromoCode";

export const AllPromos = () => {
    const { allEvents } = useCalendarContext();

    const withPromoEvents = allEvents.filter((e) => getEventPromoCodes(e).length > 0);

    return (
        <EventCalendarView events={withPromoEvents} />
    );
};