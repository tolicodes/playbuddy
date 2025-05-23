import React from 'react'
import { useCalendarContext } from "./Calendar/hooks/CalendarContext";
import EventCalendarView from "./Calendar/EventCalendarView";
import { useEffect } from "react";
import { useUserContext } from "./Auth/hooks/UserContext";
import { LoginToAccess } from '../Common/LoginToAccess';

const MyCalendar = () => {
    const { setFilters } = useCalendarContext();
    const { authUserId } = useUserContext();

    // reset filters on mount
    useEffect(() => {
        setFilters({ search: '', organizers: [] });
    }, [])

    const { wishlistEvents } = useCalendarContext();

    return (
        (authUserId)
            ? (
                <EventCalendarView events={wishlistEvents} />
            )
            : (
                <LoginToAccess entityToAccess='wishlist' />
            )
    )
}

export default MyCalendar;