import { Event } from "@common/types/commonTypes";

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type SectionType = {
    title: string;              // e.g., "Apr 13, 2025"
    data: EventWithMetadata[];  // events for that date
};