import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import type { Event, NormalizedEventInput } from "../types/commonTypes";
import axios from "axios";
import { API_BASE_URL } from "../config";

export const useFetchEvents = ({
    includeFacilitatorOnly = false,
    includeNonNY = false,
    includePrivate = false,
    includeHiddenOrganizers = false,
    includeHidden = false,
    includeApprovalPending = false,
}: {
    includeFacilitatorOnly?: boolean;
    includeNonNY?: boolean;
    includePrivate?: boolean;
    includeHiddenOrganizers?: boolean;
    includeHidden?: boolean;
    includeApprovalPending?: boolean;
} = {
        includeFacilitatorOnly: false,
        includeNonNY: false,
        includePrivate: false,
        includeHiddenOrganizers: false,
        includeHidden: false,
        includeApprovalPending: false,
    }) => {
    return useQuery<Event[]>({
        queryKey: ['events', { includeFacilitatorOnly, includeNonNY, includePrivate, includeHiddenOrganizers, includeHidden, includeApprovalPending }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (includeHiddenOrganizers) params.set('includeHiddenOrganizers', 'true');
            if (includeHidden) params.set('includeHidden', 'true');
            if (includePrivate) params.set('visibility', 'private');
            if (includeApprovalPending) params.set('approval_status', 'approved,pending');

            const queryString = params.toString() ? `?${params.toString()}` : '';

            const response = await axios.get<Event[]>(API_BASE_URL + '/events' + queryString).then((response: any) => {
                // include non NY for facilitator only
                if (includeFacilitatorOnly) {
                    return response.data;
                } else {
                    return response.data
                        .filter((event: Event) => {
                            if (includeNonNY) {
                                return !event.facilitator_only;
                            } else {
                                return !event.facilitator_only && !event.non_ny;
                            }
                        });
                }
            });
            return response;
        },
    });
};

export const useFetchUnapprovedEvents = () => {
    return useQuery<Event[]>({
        queryKey: ['unapproved-events'],
        queryFn: async () => {
            return axios.get<Event[]>(API_BASE_URL + '/events/unapproved').then((response: any) => response.data);
        },
    });
};

export const useCreateEvent = () => {
    return useMutation<Event, unknown, NormalizedEventInput>({
        mutationFn: async (event: NormalizedEventInput) => {
            return axios.post<Event>(API_BASE_URL + '/events', event).then((response: any) => response.data);
        },
    });
};

export const useCreateEventBulk = () => {
    return useMutation<Event[], unknown, NormalizedEventInput[]>({
        mutationFn: async (events: NormalizedEventInput[]) => {
            return axios.post<Event[]>(API_BASE_URL + '/events/bulk', events).then((response: any) => response.data);
        },
    });
};

export const useUpdateEvent = () => {
    return useMutation({
        mutationFn: async (updatedEvent: any) => {
            const { id, ...rest } = updatedEvent;
            const response = await axios.put(`${API_BASE_URL}/events/${id}`, { ...rest, id });
            return response.data;
        }
    });
};


export const useToggleWeeklyPickEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ eventId, status }: { eventId: number, status: boolean }) => {
            await axios.put(`${API_BASE_URL}/events/weekly-picks/${eventId}`, {
                status,
            });
            // Invalidate the "events" query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ["events"] });
        }
    });
}

export const useImportEventURLs = () => {
    return useMutation({
        mutationFn: async (data: { urls: string[]; sync?: boolean }) => {
            return axios.post(API_BASE_URL + '/events/import-urls', data).then((response: any) => response.data);
        },
    });
}

export type WeeklyPicksImageOptions = {
    weekOffset?: number;
    width?: number;
    scale?: number;
    limit?: number;
    partCount?: number;
};

export type WeeklyPicksImageStatus = {
    cacheKey: string;
    cached: boolean;
    inProgress: boolean;
    version: string | null;
    generatedAt: string | null;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    weekOffset: number | null;
    weekLabel: string | null;
    partCount: number | null;
    partHeights: number[] | null;
    splitAt: number | null;
};

export type WeeklyPicksImageLogStatus = {
    cacheKey: string;
    status: "idle" | "running" | "completed" | "failed";
    inProgress: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
    logs: string[];
};

export type WeeklyPicksImageMeta = {
    cacheKey: string | null;
    version: string | null;
    generatedAt: string | null;
    durationMs: number | null;
    weekOffset: number | null;
    weekLabel: string | null;
    width: number | null;
    height: number | null;
    partCount: number | null;
    partHeights: number[] | null;
    splitAt: number | null;
};

export type WeeklyPicksImageGenerateResult = {
    meta: WeeklyPicksImageMeta;
    logs?: string[];
};

export type WeeklyPicksImagePartResult = {
    buffer: ArrayBuffer;
    contentType: string | null;
    part: number;
};

const buildWeeklyPicksImageQuery = (
    options: WeeklyPicksImageOptions = {},
    extra: Record<string, string | number | undefined> = {}
) => {
    const params = new URLSearchParams();
    const addParam = (key: keyof WeeklyPicksImageOptions, value?: number) => {
        if (Number.isFinite(value)) {
            params.set(key, String(value));
        }
    };
    addParam("weekOffset", options.weekOffset);
    addParam("width", options.width);
    addParam("scale", options.scale);
    addParam("limit", options.limit);
    addParam("partCount", options.partCount);
    Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    });
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
};

const buildWeeklyPicksImagePayload = (options: WeeklyPicksImageOptions = {}) => {
    const payload: WeeklyPicksImageOptions = {};
    const addPayload = (key: keyof WeeklyPicksImageOptions, value?: number) => {
        if (Number.isFinite(value)) {
            payload[key] = Number(value);
        }
    };
    addPayload("weekOffset", options.weekOffset);
    addPayload("width", options.width);
    addPayload("scale", options.scale);
    addPayload("limit", options.limit);
    addPayload("partCount", options.partCount);
    return payload;
};

const parseHeaderNumber = (value?: string) => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseHeaderNumberList = (value?: string) => {
    if (!value) return null;
    const parts = value.split(',').map((part) => Number(part.trim())).filter((part) => Number.isFinite(part));
    return parts.length > 0 ? parts : null;
};

export const useFetchWeeklyPicksImageStatus = (options: WeeklyPicksImageOptions = {}) => {
    const queryString = buildWeeklyPicksImageQuery(options);
    return useQuery<WeeklyPicksImageStatus>({
        queryKey: ["weekly-picks-image-status", options],
        queryFn: async () => {
            const response = await axios.get<WeeklyPicksImageStatus>(
                `${API_BASE_URL}/events/weekly-picks/image/status${queryString}`
            );
            return response.data;
        },
    });
};

export const useFetchWeeklyPicksImageLogs = (
    options: WeeklyPicksImageOptions = {},
    queryOptions?: Omit<UseQueryOptions<WeeklyPicksImageLogStatus>, 'queryKey' | 'queryFn'>
) =>
    useQuery<WeeklyPicksImageLogStatus>({
        queryKey: ["weekly-picks-image-logs", options],
        queryFn: async () => {
            const queryString = buildWeeklyPicksImageQuery(options);
            const response = await axios.get<WeeklyPicksImageLogStatus>(
                `${API_BASE_URL}/events/weekly-picks/image/logs${queryString}`
            );
            return response.data;
        },
        ...queryOptions,
    });

export const useGenerateWeeklyPicksImage = () => {
    return useMutation<WeeklyPicksImageGenerateResult, unknown, WeeklyPicksImageOptions>({
        mutationFn: async (options: WeeklyPicksImageOptions) => {
            const payload = buildWeeklyPicksImagePayload(options);
            const response = await axios.post<{
                cacheKey?: string;
                version?: string;
                generatedAt?: string;
                durationMs?: number;
                weekOffset?: number;
                weekLabel?: string;
                width?: number;
                height?: number;
                partCount?: number;
                partHeights?: number[];
                splitAt?: number;
                logs?: string[];
            }>(`${API_BASE_URL}/events/weekly-picks/image/generate?format=json`, payload);
            const header = (key: string) => response.headers?.[key.toLowerCase()];
            const data = response.data || {};
            const logs = Array.isArray(data.logs)
                ? data.logs.filter((line: unknown): line is string => typeof line === 'string')
                : undefined;
            const meta: WeeklyPicksImageMeta = {
                cacheKey: data.cacheKey ?? header("x-weekly-picks-cache-key") ?? null,
                version: data.version ?? header("x-weekly-picks-version") ?? null,
                generatedAt: data.generatedAt ?? header("x-weekly-picks-generated-at") ?? null,
                durationMs: data.durationMs ?? parseHeaderNumber(header("x-weekly-picks-generate-duration-ms")),
                weekOffset: data.weekOffset ?? parseHeaderNumber(header("x-weekly-picks-week-offset")),
                weekLabel: data.weekLabel ?? header("x-weekly-picks-week-label") ?? null,
                width: data.width ?? parseHeaderNumber(header("x-weekly-picks-width")),
                height: data.height ?? parseHeaderNumber(header("x-weekly-picks-height")),
                partCount: data.partCount ?? parseHeaderNumber(header("x-weekly-picks-part-count")),
                partHeights: data.partHeights ?? parseHeaderNumberList(header("x-weekly-picks-part-heights")),
                splitAt: data.splitAt ?? parseHeaderNumber(header("x-weekly-picks-split-at")),
            };
            return { meta, logs };
        },
    });
};

export const useFetchWeeklyPicksImagePart = () => {
    return useMutation<WeeklyPicksImagePartResult, unknown, { options: WeeklyPicksImageOptions; part: number }>({
        mutationFn: async ({ options, part }) => {
            const queryString = buildWeeklyPicksImageQuery(options, { part, format: "jpg" });
            const response = await axios.get<ArrayBuffer>(
                `${API_BASE_URL}/events/weekly-picks/image${queryString}`,
                { responseType: "arraybuffer" }
            );
            return {
                buffer: response.data,
                contentType: response.headers?.["content-type"] ?? null,
                part,
            };
        },
    });
};
