import React from 'react'
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useUserContext } from "../Auth/hooks/UserContext";
import { LoginToAccess } from '../../components/LoginToAccess';

const MyCalendar = () => {
    const { authUserId } = useUserContext();
    const { wishlistEvents } = useCalendarContext();

    return (
        (authUserId)
            ? (
                <EventCalendarView
                    events={wishlistEvents || []}
                    showGoogleCalendar={true}
                    entity='my_calendar'
                />
            )
            : (
                <LoginToAccess entityToAccess='My Calendar' />
            )
    )
}

export default MyCalendar;