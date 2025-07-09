import { Event } from "../Common/types/commonTypes";

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

        if (event.type) {
            counters.event_types[event.type] = (counters.event_types[event.type] || 0) + 1;
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
