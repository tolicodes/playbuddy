import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE, Event } from "../Common/types/commonTypes";

type TagCount = {
    name: string;
    count: number;
};

type TagCountsByCategory = {
    tags: TagCount[];
    experience_levels: TagCount[];
    interactivity_levels: TagCount[];
    event_types: TagCount[];
};

const isActiveEventType = (value?: string | null) =>
    !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);

const resolveEventType = (event: Event) => {
    if (event.play_party || event.type === 'play_party') return 'play_party';
    if (event.is_munch || event.type === 'munch') return 'munch';
    if (isActiveEventType(event.type)) return event.type;
    return FALLBACK_EVENT_TYPE;
};

export function getAllClassificationsFromEvents(events: Event[]): TagCountsByCategory {
    const counters: Record<keyof TagCountsByCategory, Record<string, number>> = {
        tags: {},
        experience_levels: {},
        interactivity_levels: {},
        event_types: {},
    };

    for (const event of events) {
        event.classification?.tags?.forEach(tag => {
            counters.tags[tag] = (counters.tags[tag] || 0) + 1;
        });

        if (event.classification?.experience_level) {
            const level = event.classification.experience_level;
            counters.experience_levels[level] = (counters.experience_levels[level] || 0) + 1;
        }

        if (event.classification?.interactivity_level) {
            const level = event.classification.interactivity_level;
            counters.interactivity_levels[level] = (counters.interactivity_levels[level] || 0) + 1;
        }

        const resolvedType = resolveEventType(event);
        if (resolvedType) {
            counters.event_types[resolvedType] = (counters.event_types[resolvedType] || 0) + 1;
        }
    }

    const result: TagCountsByCategory = {
        tags: [],
        experience_levels: [],
        interactivity_levels: [],
        event_types: [],
    };

    for (const key in counters) {
        const category = key as keyof TagCountsByCategory;
        result[category] = Object.entries(counters[category])
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    return result;
}
