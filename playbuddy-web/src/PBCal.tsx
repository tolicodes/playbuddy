import React, { useState, useEffect } from 'react';
import { getEvents, getUserCalendar } from './EventCalendar/calendarUtils';
import { Event } from './Common/commonTypes';


const PB_SHARE_CODE = 'DCK9PD';

export const PBCal = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [wishlistEvents, setWishlistEvents] = useState<string[]>([]);

    useEffect(() => {
        getEvents().then((events) => {
            setEvents(events);
        });

        getUserCalendar({ share_code: PB_SHARE_CODE }).then((events: string[]) => {
            setWishlistEvents(events);
        });
    }, []);


    const pbEvents = events.filter((event) => wishlistEvents.find((wishlistEvent) => {
        return wishlistEvent === event.id;
    }));


    return (<div>
        <h1>PB&apos;s Calendar</h1>
        {/* <EventCalendar events={pbEvents} /> */}
        {
            pbEvents.map((event) => {
                const eventDate = new Date(event.start_date);
                const dayOfWeek = eventDate.toLocaleString('en-US', { weekday: 'short' });
                const formattedDate = eventDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                return (
                    <div key={event.id}>
                        <strong>{dayOfWeek} {formattedDate}</strong>
                        <br />
                        {event.name} ({event.organizer.name})
                        <br />
                        <a href={event.ticket_url}>{event.ticket_url}</a>
                        <br />
                        <br />
                    </div>
                );
            })
        }
    </div>)
}   