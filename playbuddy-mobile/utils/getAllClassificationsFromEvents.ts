import { Event } from "../Common/types/commonTypes";

type ThemeCount = {
    name: string;
    count: number;
};

export function getAllClassificationsFromEvents(events: Event[]): ThemeCount[] {
    const themeCounter: Record<string, number> = {};

    for (const event of events) {
        for (const theme of event.event_themes || []) {
            themeCounter[theme] = (themeCounter[theme] || 0) + 1;
        }
    }

    return Object.entries(themeCounter)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}
