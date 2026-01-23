/* global globalThis */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
const EVENTS_CACHE_FALLBACK_DELAY_MS = 3000;
const getCachedAxiosReader = () => {
    if (typeof globalThis === "undefined")
        return null;
    const reader = globalThis.__PB_READ_AXIOS_CACHE__;
    return typeof reader === "function" ? reader : null;
};
const extractCachedEvents = (value) => {
    if (Array.isArray(value))
        return value;
    if (value && typeof value === "object" && Array.isArray(value.data)) {
        return value.data;
    }
    return null;
};
const readCachedEvents = async (requestUrl) => {
    const reader = getCachedAxiosReader();
    if (!reader)
        return null;
    try {
        const cached = await reader({ url: requestUrl, method: "get" });
        return extractCachedEvents(cached);
    }
    catch {
        return null;
    }
};
export const useFetchEvents = ({ includeFacilitatorOnly = false, includeNonNY = false, includePrivate = false, includeHiddenOrganizers = false, includeHidden = false, includeApprovalPending = false, approvalStatuses, } = {
    includeFacilitatorOnly: false,
    includeNonNY: false,
    includePrivate: false,
    includeHiddenOrganizers: false,
    includeHidden: false,
    includeApprovalPending: false,
}) => {
    const approvalStatusesKey = useMemo(() => (approvalStatuses ? approvalStatuses.join(',') : ''), [approvalStatuses]);
    const requestUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (includeHiddenOrganizers)
            params.set('includeHiddenOrganizers', 'true');
        if (includeHidden)
            params.set('includeHidden', 'true');
        if (includePrivate)
            params.set('visibility', 'private');
        if (approvalStatusesKey) {
            params.set('approval_status', approvalStatusesKey);
        }
        else if (includeApprovalPending) {
            params.set('approval_status', 'approved,pending');
        }
        const queryString = params.toString() ? `?${params.toString()}` : '';
        return API_BASE_URL + '/events' + queryString;
    }, [includeHiddenOrganizers, includeHidden, includePrivate, includeApprovalPending, approvalStatusesKey]);
    const applyEventFilters = useMemo(() => {
        return (events) => {
            if (includeFacilitatorOnly)
                return events;
            return events.filter((event) => {
                if (includeNonNY) {
                    return !event.facilitator_only;
                }
                return !event.facilitator_only && !event.non_ny;
            });
        };
    }, [includeFacilitatorOnly, includeNonNY]);
    const query = useQuery({
        queryKey: ['events', { includeFacilitatorOnly, includeNonNY, includePrivate, includeHiddenOrganizers, includeHidden, includeApprovalPending, approvalStatuses }],
        queryFn: async () => {
            const requestStart = Date.now();
            const devFlag = typeof window !== "undefined" && window.__DEV__;
            const shouldLogTiming = devFlag === true ||
                (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production");
            try {
                const response = await axios.get(requestUrl);
                const fetchMs = Date.now() - requestStart;
                const filterStart = Date.now();
                // include non NY for facilitator only
                const filtered = applyEventFilters(response.data);
                const filterMs = Date.now() - filterStart;
                if (shouldLogTiming) {
                    const rawCount = response.data?.length ?? 0;
                    const filteredCount = filtered.length;
                    console.log(`[events] loaded ${rawCount} events in ${fetchMs}ms, filtered to ${filteredCount} in ${filterMs}ms (${requestUrl})`);
                }
                return filtered;
            }
            catch (error) {
                if (shouldLogTiming) {
                    const elapsedMs = Date.now() - requestStart;
                    console.log(`[events] load failed after ${elapsedMs}ms (${requestUrl})`, error);
                }
                throw error;
            }
        },
    });
    const [cachedFallback, setCachedFallback] = useState(undefined);
    useEffect(() => {
        setCachedFallback(undefined);
    }, [requestUrl, includeFacilitatorOnly, includeNonNY]);
    useEffect(() => {
        if (query.data !== undefined && cachedFallback) {
            setCachedFallback(undefined);
        }
    }, [query.data, cachedFallback]);
    useEffect(() => {
        if (query.data !== undefined || !query.isFetching)
            return;
        let cancelled = false;
        const timeoutId = setTimeout(async () => {
            if (cancelled || query.data !== undefined || !query.isFetching)
                return;
            const cached = await readCachedEvents(requestUrl);
            if (cancelled || !cached)
                return;
            setCachedFallback(applyEventFilters(cached));
        }, EVENTS_CACHE_FALLBACK_DELAY_MS);
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [applyEventFilters, query.data, query.isFetching, requestUrl]);
    const data = query.data ?? cachedFallback;
    const isLoading = query.isLoading && data === undefined;
    const error = cachedFallback ? null : query.error;
    const isError = cachedFallback ? false : query.isError;
    return { ...query, data, isLoading, error, isError };
};
export const useFetchUnapprovedEvents = () => {
    return useQuery({
        queryKey: ['unapproved-events'],
        queryFn: async () => {
            return axios.get(API_BASE_URL + '/events/unapproved').then((response) => response.data);
        },
    });
};
export const useCreateEvent = () => {
    return useMutation({
        mutationFn: async (event) => {
            return axios.post(API_BASE_URL + '/events', event).then((response) => response.data);
        },
    });
};
export const useCreateEventBulk = () => {
    return useMutation({
        mutationFn: async (events) => {
            return axios.post(API_BASE_URL + '/events/bulk', events).then((response) => response.data);
        },
    });
};
export const useUpdateEvent = () => {
    return useMutation({
        mutationFn: async (updatedEvent) => {
            const { id, ...rest } = updatedEvent;
            const response = await axios.put(`${API_BASE_URL}/events/${id}`, { ...rest, id });
            return response.data;
        }
    });
};
export const useFlushEventsCache = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/events`, {
                params: { flushCache: true },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });
};
export const useToggleWeeklyPickEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ eventId, status }) => {
            await axios.put(`${API_BASE_URL}/events/weekly-picks/${eventId}`, {
                status,
            });
            // Invalidate the "events" query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ["events"] });
        }
    });
};
export const useImportEventURLs = () => {
    return useMutation({
        mutationFn: async (data) => {
            return axios.post(API_BASE_URL + '/events/import-urls', data).then((response) => response.data);
        },
    });
};
const buildWeeklyPicksImageQuery = (options = {}, extra = {}) => {
    const params = new URLSearchParams();
    const addParam = (key, value) => {
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
const buildWeeklyPicksImagePayload = (options = {}) => {
    const payload = {};
    const addPayload = (key, value) => {
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
const parseHeaderNumber = (value) => {
    if (!value)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const parseHeaderNumberList = (value) => {
    if (!value)
        return null;
    const parts = value.split(',').map((part) => Number(part.trim())).filter((part) => Number.isFinite(part));
    return parts.length > 0 ? parts : null;
};
export const useFetchWeeklyPicksImageStatus = (options = {}) => {
    const queryString = buildWeeklyPicksImageQuery(options);
    return useQuery({
        queryKey: ["weekly-picks-image-status", options],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/events/weekly-picks/image/status${queryString}`);
            return response.data;
        },
    });
};
export const useFetchWeeklyPicksImageLogs = (options = {}, queryOptions) => useQuery({
    queryKey: ["weekly-picks-image-logs", options],
    queryFn: async () => {
        const queryString = buildWeeklyPicksImageQuery(options);
        const response = await axios.get(`${API_BASE_URL}/events/weekly-picks/image/logs${queryString}`);
        return response.data;
    },
    ...queryOptions,
});
export const useGenerateWeeklyPicksImage = () => {
    return useMutation({
        mutationFn: async (options) => {
            const payload = buildWeeklyPicksImagePayload(options);
            const response = await axios.post(`${API_BASE_URL}/events/weekly-picks/image/generate?format=json`, payload);
            const header = (key) => response.headers?.[key.toLowerCase()];
            const data = response.data || {};
            const logs = Array.isArray(data.logs)
                ? data.logs.filter((line) => typeof line === 'string')
                : undefined;
            const meta = {
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
    return useMutation({
        mutationFn: async ({ options, part }) => {
            const queryString = buildWeeklyPicksImageQuery(options, { part, format: "jpg" });
            const response = await axios.get(`${API_BASE_URL}/events/weekly-picks/image${queryString}`, { responseType: "arraybuffer" });
            return {
                buffer: response.data,
                contentType: response.headers?.["content-type"] ?? null,
                part,
            };
        },
    });
};
