import { useEffect, useState } from "react";
import type { Event } from '../../../../common/src/types/commonTypes';
import { useGroupedEvents } from '../../../../playbuddy-mobile/Pages/Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from "./EventListItem";
import styles from './EventList.module.css';
import type { SectionType } from "./util/types";

export const EventList = ({ events, isLoadingEvents }: { events: Event[], isLoadingEvents: boolean }) => {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const { sections } = useGroupedEvents(events);

    useEffect(() => {
        if (!selectedEvent) return;
        window.location.href = `/event/${selectedEvent.id}`;
    }, [selectedEvent]);


    return (
        <div className={styles.eventList}>
            {isLoadingEvents && (
                <div className={styles.loaderOverlay}>
                    <div className={styles.spinner} />
                </div>
            )}
            {!isLoadingEvents && sections.length === 0 ? (
                <div className={styles.emptyList}>
                    <p className={styles.emptyText}>No events found</p>
                </div>
            ) : (
                sections.map((section: SectionType, i: number) => (
                    <div key={i} className={styles.eventSection}>
                        <div className={styles.sectionHeader}>{section.title}</div>
                        {section.data.map((event: Event) => (
                            <div key={`${i}_${event.id}`} className={styles.eventItemWrapper}>
                                <EventListItem item={event} onPress={setSelectedEvent} />
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};
