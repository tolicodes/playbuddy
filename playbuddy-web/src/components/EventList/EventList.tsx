import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useGroupedEvents } from '../../../../playbuddy-mobile/Pages/Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from "./EventListItem";
import styles from './EventList.module.css';
import type { EventWithMetadata, SectionType } from "./util/types";
import { getTagChipTone, getTagChips } from "./util/tagUtils";

export const EventList = ({
    events,
    isLoadingEvents,
}: {
    events: EventWithMetadata[];
    isLoadingEvents: boolean;
}) => {
    const [selectedEvent, setSelectedEvent] = useState<EventWithMetadata | null>(null);

    const { sections } = useGroupedEvents(events);

    const toTimestamp = (value: string) => {
        const time = new Date(value).getTime();
        return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const weeklyPicks = useMemo(() => {
        if (!events.length) return [];
        const now = Date.now();
        const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
        const upcomingWeek = events
            .filter((event) => {
                const time = toTimestamp(event.start_date);
                return time >= now && time <= weekFromNow;
            })
            .sort((a, b) => toTimestamp(a.start_date) - toTimestamp(b.start_date));
        const picks = upcomingWeek.filter((event) => event.weekly_pick);
        const source = picks.length ? picks : upcomingWeek;
        return source.slice(0, 6);
    }, [events]);

    const formatWeeklyMeta = (event: EventWithMetadata) => {
        const start = new Date(event.start_date);
        if (!Number.isFinite(start.getTime())) return '';
        const dateLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeLabel = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return `${dateLabel} · ${timeLabel}`;
    };

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
            <div className={styles.eventListInner}>
                {weeklyPicks.length > 0 && (
                    <section className={styles.weeklySection}>
                        <div className={styles.weeklyHeader}>
                            <div>
                                <div className={styles.weeklyTitle}>Weekly Picks</div>
                                <div className={styles.weeklySubtitle}>
                                    Handpicked events for the week ahead.
                                </div>
                            </div>
                        </div>
                        <div className={styles.weeklyScroller}>
                            {weeklyPicks.map((event) => {
                                const tagChips = getTagChips(event).slice(0, 3);
                                const imageUrl = event.image_url;
                                return (
                                    <button
                                        key={`weekly_${event.id}`}
                                        type="button"
                                        className={styles.weeklyCard}
                                        onClick={() => setSelectedEvent(event)}
                                        aria-label={`Open weekly pick ${event.name}`}
                                    >
                                        <div className={styles.weeklyPoster}>
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={event.name}
                                                    className={styles.weeklyPosterImage}
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            ) : (
                                                <div className={styles.weeklyPosterPlaceholder}>
                                                    Weekly pick
                                                </div>
                                            )}
                                            <div className={styles.weeklyOverlay} />
                                            <span className={styles.weeklyPill}>Weekly pick</span>
                                            <div className={styles.weeklyFooter}>
                                                <div className={styles.weeklyCardTitle}>
                                                    {event.name}
                                                </div>
                                                <div className={styles.weeklyCardMeta}>
                                                    {formatWeeklyMeta(event)}
                                                </div>
                                            </div>
                                        </div>
                                        {tagChips.length > 0 && (
                                            <div className={styles.weeklyTags}>
                                                {tagChips.map((tag) => {
                                                    const colors = getTagChipTone(tag);
                                                    return (
                                                        <span
                                                            key={`${event.id}-${tag.label}`}
                                                            className={styles.weeklyTag}
                                                            style={{
                                                                backgroundColor: colors.background,
                                                                borderColor: colors.border,
                                                                color: colors.text,
                                                            }}
                                                        >
                                                            {tag.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}
                {!isLoadingEvents && sections.length === 0 ? (
                    <div className={styles.emptyList}>
                        <p className={styles.emptyText}>No events found</p>
                    </div>
                ) : (
                    sections.map((section: SectionType) => (
                        <div key={section.key || section.title} className={styles.eventSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionHeaderPill}>{section.title}</div>
                            </div>
                            {section.data.map((event: EventWithMetadata, index: number) => (
                                <div
                                    key={`${section.key || section.title}_${event.id}`}
                                    className={styles.eventItemWrapper}
                                    style={
                                        {
                                            "--item-delay": `${index * 0.05}s`,
                                        } as CSSProperties
                                    }
                                >
                                    <EventListItem item={event} onPress={setSelectedEvent} />
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
