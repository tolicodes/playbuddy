// src/pages/WeeklyPicksScreen.tsx

import React from "react";
import moment from 'moment-timezone';
import { useFetchWishlistByCode } from "../../common/db-axios/useWishlist";
import { useFetchEvents, useToggleWeeklyPickEvent } from "../../common/db-axios/useEvents";
import { Event } from "../../common/types/commonTypes";
import WeeklyPickWhatsappMessage from "./WeeklyPicksWhasappMessage";

// Base URLs
const PB_SHARE_CODE = "DCK9PD";

function getNYWeekStart(date: string | Date): string {
    const m = moment.tz(date, 'America/New_York');
    const day = m.day(); // 0 (Sun) to 6 (Sat)
    const diff = (day + 6) % 7; // convert Sun→6, Mon→0, Tue→1...
    return m.subtract(diff, 'days').startOf('day').format('YYYY-MM-DD');
}


// Format a week range, e.g. "Jun 2 – Jun 8"
function formatWeekRange(weekStart: Date): string {
    const nyStart = moment.tz(weekStart, 'America/New_York');
    const nyEnd = nyStart.clone().add(6, 'days');

    // If months are different, show both. Otherwise, drop repeated month.
    if (nyStart.month() !== nyEnd.month()) {
        return `${nyStart.format('MMM D')} – ${nyEnd.format('MMM D')}`;
    } else {
        return `${nyStart.format('MMM D')} – ${nyEnd.format('D')}`;
    }
}

export default function WeeklyPicksScreen() {
    const { data: wishlist, isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { data: events, isLoading: eventsLoading, error: eventsError } = useFetchEvents();
    const { mutate: toggleWeeklyPickEvent, isPending: toggleWeeklyPickEventLoading, error: toggleWeeklyPickEventError } = useToggleWeeklyPickEvent();

    // Build a Set of event IDs in wishlist for quick lookup
    const wishlistSet = React.useMemo(() => {
        const set = new Set<number>();
        wishlist?.forEach((item) => set.add(item));
        return set;
    }, [wishlist]);


    if (eventsLoading || wishlistLoading) {
        return (
            <div style={styles.loadingContainer}>
                <span style={styles.loadingText}>Loading…</span>
            </div>
        );
    }

    if (eventsError) {
        return (
            <p style={styles.errorText}>Error fetching events: {eventsError.message}</p>
        );
    }

    if (wishlistError) {
        return (
            <p style={styles.errorText}>Error fetching wishlist: {wishlistError.message}</p>
        );
    }

    // Group events by week start (Sunday)
    const eventsByWeek: Record<string, Event[]> = {};
    events!.forEach((evt) => {
        const weekStart = getNYWeekStart(evt.start_date);
        if (!eventsByWeek[weekStart]) eventsByWeek[weekStart] = [];
        eventsByWeek[weekStart].push(evt);
    });

    // Sort week keys ascending by date (earliest week first)
    const sortedWeekKeys = Object.keys(eventsByWeek).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
    });

    return (
        <div style={styles.container}>
            {/* Fixed header */}
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>Weekly Picks</h1>
            </div>

            {/* Scrollable list of weeks */}
            <div style={styles.content}>
                <WeeklyPickWhatsappMessage events={events!} />
                {sortedWeekKeys.length === 0 ? (
                    <p style={styles.noEventsText}>No events available.</p>
                ) : (
                    sortedWeekKeys.map((weekStartStr) => {
                        const weekStartDate = moment.tz(weekStartStr, 'America/New_York').toDate();
                        // Sort events within the week ascending by start_date
                        const weekEvents = eventsByWeek[weekStartStr].sort(
                            (a, b) =>
                                new Date(a.start_date).getTime() -
                                new Date(b.start_date).getTime()
                        );

                        return (
                            <div key={weekStartStr} style={styles.weekBlock}>
                                <h2 style={styles.weekTitle}>
                                    {formatWeekRange(weekStartDate)}
                                </h2>
                                <ul style={styles.eventList}>
                                    {weekEvents.map((evt) => {
                                        const isWeeklyPick = evt?.weekly_pick;
                                        const isInWishlist = wishlistSet.has(evt.id);
                                        return (
                                            <li key={evt.id} style={styles.eventItem}>
                                                {/* Event image */}
                                                {evt.image_url ? (
                                                    <img
                                                        src={evt.image_url}
                                                        alt={evt.name}
                                                        style={styles.eventImage}
                                                    />
                                                ) : (
                                                    <div style={styles.placeholderImage}>
                                                        <span style={styles.placeholderText}>
                                                            No Image
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Event details */}
                                                <div style={styles.eventDetails}>
                                                    <p style={styles.eventName}>{evt.name}</p>
                                                    <p style={styles.eventOrganizer}>
                                                        {evt.organizer.name}
                                                    </p>
                                                    <p style={styles.description}>
                                                        {evt.short_description}
                                                    </p>
                                                    <p style={styles.eventDate}>
                                                        {new Date(evt.start_date).toLocaleString([], {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>

                                                {/* Checkboxes */}
                                                <div style={styles.checkboxGroup}>
                                                    {/* Weekly Pick Checkbox */}
                                                    <input
                                                        type="checkbox"
                                                        checked={isWeeklyPick}
                                                        onChange={() => toggleWeeklyPickEvent({
                                                            eventId: evt.id,
                                                            status: !isWeeklyPick
                                                        })}
                                                        style={styles.checkbox}
                                                    />
                                                    {/* Read-only Wishlist Checkbox */}
                                                    <input
                                                        type="checkbox"
                                                        checked={isInWishlist}
                                                        disabled
                                                        style={styles.checkbox}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// Inline styles for mobile-friendly layout
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#F9FAFB",
    },
    header: {
        position: "sticky",
        top: 0,
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        padding: "12px 16px",
        zIndex: 10,
    },
    headerTitle: {
        margin: 0,
        fontSize: "20px",
        fontWeight: 600,
        color: "#111827",
    },
    content: {
        flex: 1,
        overflowY: "auto",
        padding: "8px 0",
    },
    weekBlock: {
        marginBottom: "24px",
        padding: "0 16px",
    },
    weekTitle: {
        fontSize: "16px",
        fontWeight: 500,
        color: "#374151",
        marginBottom: "8px",
    },
    eventList: {
        listStyle: "none",
        margin: 0,
        padding: 0,
    },
    eventItem: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        marginBottom: "8px",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    eventImage: {
        width: "56px",
        height: "56px",
        objectFit: "cover",
        flexShrink: 0,
    },
    placeholderImage: {
        width: "56px",
        height: "56px",
        backgroundColor: "#E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    placeholderText: {
        fontSize: "10px",
        color: "#6B7280",
    },
    eventDetails: {
        flex: 1,
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
    },
    eventName: {
        fontSize: "14px",
        fontWeight: 500,
        color: "#111827",
        margin: 0,
    },
    eventOrganizer: {
        fontSize: "12px",
        color: "#6B7280",
        margin: "4px 0 0 0",
    },
    eventDate: {
        fontSize: "11px",
        color: "#6B7280",
        margin: "2px 0 0 0",
    },
    checkboxGroup: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingRight: "12px",
    },
    checkbox: {
        marginBottom: "4px",
        width: "20px",
        height: "20px",
    },
    loadingContainer: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "32px 0",
    },
    loadingText: {
        fontSize: "16px",
        color: "#6B7280",
    },
    errorText: {
        textAlign: "center",
        color: "#DC2626",
        padding: "32px 0",
    },
    noEventsText: {
        textAlign: "center",
        color: "#6B7280",
        marginTop: "32px",
    },
    description: {
        fontSize: "12px",
        color: "#6B7280",
        margin: "2px 0 0 0",
    },
};
