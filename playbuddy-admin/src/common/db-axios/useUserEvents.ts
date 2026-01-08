import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { UserEvent } from "../types/commonTypes";

export type UserEventsResponse = {
    data: UserEvent[];
    count: number | null;
    countIsEstimated?: boolean;
    range: { start: string; end: string };
    limit: number;
    isTruncated: boolean;
};

export type UserEventsAnalyticsResponse = {
    range: { start: string; end: string };
    limit: number;
    isTruncated: boolean;
    totalInRange: number;
    totalEvents: number;
    stats: {
        uniqueUsers: number;
        distinctEventNames: number;
        uniqueEventIds: number;
        eventLinked: number;
    };
    daySeries: { date: string; count: number }[];
    topNames: { label: string; count: number }[];
    topEventIds: { label: string; count: number }[];
    eventMetaById: Record<string, { name: string; organizer_name: string | null }>;
    recentEvents: UserEvent[];
};

type FetchUserEventsParams = {
    start?: string;
    end?: string;
    limit?: number;
    eventNames?: string[];
    includeCount?: boolean;
    enabled?: boolean;
};

type FetchUserEventsAnalyticsParams = {
    start?: string;
    end?: string;
    limit?: number;
    search?: string;
    onlySignedIn?: boolean;
    onlyEventRelated?: boolean;
    recentLimit?: number;
    topLimit?: number;
    enabled?: boolean;
};

export const useFetchUserEvents = ({
    start,
    end,
    limit = 100000,
    eventNames,
    includeCount = false,
    enabled = true,
}: FetchUserEventsParams) => {
    return useQuery<UserEventsResponse>({
        queryKey: ["user-events", { start, end, limit, eventNames, includeCount }],
        enabled,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (start) params.set("start", start);
            if (end) params.set("end", end);
            if (limit) params.set("limit", String(limit));
            if (eventNames?.length) params.set("event_names", eventNames.join(","));
            if (includeCount) params.set("include_count", "true");

            const queryString = params.toString() ? `?${params.toString()}` : "";
            const response = await axios.get<UserEventsResponse>(`${API_BASE_URL}/user_events${queryString}`);
            return response.data;
        },
    });
};

export const useFetchUserEventsAnalytics = ({
    start,
    end,
    limit = 100000,
    search,
    onlySignedIn = false,
    onlyEventRelated = false,
    recentLimit,
    topLimit,
    enabled = true,
}: FetchUserEventsAnalyticsParams) => {
    return useQuery<UserEventsAnalyticsResponse>({
        queryKey: [
            "user-events-analytics",
            { start, end, limit, search, onlySignedIn, onlyEventRelated, recentLimit, topLimit },
        ],
        enabled,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (start) params.set("start", start);
            if (end) params.set("end", end);
            if (limit) params.set("limit", String(limit));
            if (search) params.set("search", search);
            if (onlySignedIn) params.set("only_signed_in", "true");
            if (onlyEventRelated) params.set("only_event_related", "true");
            if (recentLimit) params.set("recent_limit", String(recentLimit));
            if (topLimit) params.set("top_limit", String(topLimit));

            const queryString = params.toString() ? `?${params.toString()}` : "";
            const response = await axios.get<UserEventsAnalyticsResponse>(
                `${API_BASE_URL}/user_events/analytics${queryString}`
            );
            return response.data;
        },
    });
};
