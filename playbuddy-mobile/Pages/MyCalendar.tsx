import React from 'react'
import { useCalendarContext } from "./Calendar/hooks/CalendarContext";
import EventCalendarView from "./Calendar/EventCalendarView/EventCalendarView";
import { useUserContext } from "./Auth/hooks/UserContext";
import { LoginToAccess } from '../Common/LoginToAccess';

const MyCalendar = () => {
    const { authUserId } = useUserContext();
    const { wishlistEvents } = useCalendarContext();

    return (
        (authUserId)
            ? (
                <EventCalendarView events={wishlistEvents || []} showGoogleCalendar={true} />
            )
            : (
                <LoginToAccess entityToAccess='wishlist' />
            )
    )
}

export default MyCalendar;