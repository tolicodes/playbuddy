// src/pages/WeeklyPicksScreen.tsx

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// Define the shape of an Event returned by the PlayBuddy API
interface EventItem {
    id: number;
    name: string;
    organizer: {
        name: string;
    };
    image_url?: string | null;
    start_date: string; // ISO string
    weekly_pick: boolean; // indicates if this event is currently a weekly pick
}

// Define the shape of a wishlist entry (assuming it returns event IDs)
type WishlistItem = number;

// Base URLs
const API_BASE_URL = "http://localhost:8080";
const PB_SHARE_CODE = "DCK9PD";

// Fetch all events from PlayBuddy and sort so earliest start_date first
async function fetchEvents(): Promise<EventItem[]> {
    const res = await axios.get(`${API_BASE_URL}/events`);
    return (res.data as EventItem[]).sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
}

// Fetch wishlist entries for the given share code
async function fetchWishlist(): Promise<WishlistItem[]> {
    const res = await axios.get(`${API_BASE_URL}/wishlist/code/${PB_SHARE_CODE}`);
    return res.data as WishlistItem[];
}

// Utility: Given a Date, return the Date of the Sunday at the start of that week
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Format a week range, e.g. "Jun 2 – Jun 8"
function formatWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return (
        weekStart.toLocaleDateString(undefined, options) +
        " – " +
        weekEnd.toLocaleDateString(undefined, options)
    );
}

export default function WeeklyPicksScreen() {
    const queryClient = useQueryClient();

    // Query: events
    const {
        data: events,
        isLoading: eventsLoading,
        error: eventsError,
    } = useQuery<EventItem[], Error>({
        queryKey: ["events"],
        queryFn: fetchEvents,
    });

    // Query: wishlist
    const {
        data: wishlist,
        isLoading: wishlistLoading,
        error: wishlistError,
    } = useQuery<WishlistItem[], Error>({
        queryKey: ["wishlist", PB_SHARE_CODE],
        queryFn: fetchWishlist,
    });

    console.log('wishlist', wishlist);

    // Build a Set of event IDs in wishlist for quick lookup
    const wishlistSet = React.useMemo(() => {
        const set = new Set<number>();
        wishlist?.forEach((item) => set.add(item));
        return set;
    }, [wishlist]);

    // Toggle weekly_pick status via backend, then invalidate cache
    const togglePick = async (evt: EventItem) => {
        try {
            await axios.put(`${API_BASE_URL}/events/weekly-picks/${evt.id}`, {
                status: !evt.weekly_pick,
            });
            // Invalidate the "events" query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ["events"] });
        } catch (err) {
            console.error("Failed to update weekly pick status", err);
        }
    };

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
    const eventsByWeek: Record<string, EventItem[]> = {};
    events!.forEach((evt) => {
        const weekStart = getWeekStart(new Date(evt.start_date))
            .toISOString()
            .slice(0, 10);
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
                {sortedWeekKeys.length === 0 ? (
                    <p style={styles.noEventsText}>No events available.</p>
                ) : (
                    sortedWeekKeys.map((weekStartStr) => {
                        const weekStartDate = new Date(weekStartStr);
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
                                        const isPicked = evt.weekly_pick;
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
                                                        checked={isPicked}
                                                        onChange={() => togglePick(evt)}
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
};
