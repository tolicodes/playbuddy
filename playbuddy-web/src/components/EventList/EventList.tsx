import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useGroupedEvents } from '../../../../playbuddy-mobile/Pages/Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from "./EventListItem";
import styles from './EventList.module.css';
import type { EventWithMetadata, SectionType } from "./util/types";
import { getTagChipTone, getTagChips } from "./util/tagUtils";

const normalizeSearchText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const EventList = ({
    events,
    isLoadingEvents,
}: {
    events: EventWithMetadata[];
    isLoadingEvents: boolean;
}) => {
    const [selectedEvent, setSelectedEvent] = useState<EventWithMetadata | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const normalizedSearch = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
    const searchTokens = useMemo(
        () => (normalizedSearch ? normalizedSearch.split(' ') : []),
        [normalizedSearch]
    );

    const filteredEvents = useMemo(() => {
        if (!searchTokens.length) return events;
        return events.filter((event) => {
            const organizerAliases = Array.isArray(event.organizer?.aliases)
                ? event.organizer.aliases
                : [];
            const tags = [
                ...(event.tags || []),
                ...(event.classification?.tags || []),
            ].filter(Boolean);
            const searchTarget = normalizeSearchText([
                event.name,
                event.organizer?.name,
                ...organizerAliases,
                ...tags,
            ]
                .filter(Boolean)
                .join(' '));
            return searchTokens.every((token) => searchTarget.includes(token));
        });
    }, [events, searchTokens]);

    const { sections } = useGroupedEvents(filteredEvents);

    const toTimestamp = (value: string) => {
        const time = new Date(value).getTime();
        return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const weeklyPicks = useMemo(() => {
        if (!filteredEvents.length) return [];
        const now = Date.now();
        const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
        const upcomingWeek = filteredEvents
            .filter((event) => {
                const time = toTimestamp(event.start_date);
                return time >= now && time <= weekFromNow;
            })
            .sort((a, b) => toTimestamp(a.start_date) - toTimestamp(b.start_date));
        const picks = upcomingWeek.filter((event) => event.weekly_pick);
        const source = picks.length ? picks : upcomingWeek;
        return source.slice(0, 6);
    }, [filteredEvents]);

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

    const emptyLabel = searchTokens.length > 0 ? 'No matching events found' : 'No events found';

    return (
        <div className={styles.eventList}>
            {isLoadingEvents && (
                <div className={styles.loaderOverlay}>
                    <div className={styles.spinner} />
                </div>
            )}
            <div className={styles.eventListInner}>
                <div className={styles.searchBar}>
                    <input
                        type="search"
                        className={styles.searchInput}
                        placeholder="Search events, tags, organizers"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        aria-label="Search events, tags, organizers"
                    />
                    {searchQuery.length > 0 && (
                        <button
                            type="button"
                            className={styles.searchClear}
                            onClick={() => setSearchQuery('')}
                        >
                            Clear
                        </button>
                    )}
                </div>
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
                        <p className={styles.emptyText}>{emptyLabel}</p>
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
