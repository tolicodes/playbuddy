import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchEvents = ({ includeFacilitatorOnly = false, includeNonNY = false, includePrivate = false, includeHiddenOrganizers = false, includeHidden = false, includeApprovalPending = false, approvalStatuses, } = {
    includeFacilitatorOnly: false,
    includeNonNY: false,
    includePrivate: false,
    includeHiddenOrganizers: false,
    includeHidden: false,
    includeApprovalPending: false,
}) => {
    return useQuery({
        queryKey: ['events', { includeFacilitatorOnly, includeNonNY, includePrivate, includeHiddenOrganizers, includeHidden, includeApprovalPending, approvalStatuses }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (includeHiddenOrganizers)
                params.set('includeHiddenOrganizers', 'true');
            if (includeHidden)
                params.set('includeHidden', 'true');
            if (includePrivate)
                params.set('visibility', 'private');
            if (approvalStatuses && approvalStatuses.length) {
                params.set('approval_status', approvalStatuses.join(','));
            }
            else if (includeApprovalPending) {
                params.set('approval_status', 'approved,pending');
            }
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const response = await axios.get(API_BASE_URL + '/events' + queryString).then((response) => {
                // include non NY for facilitator only
                if (includeFacilitatorOnly) {
                    return response.data;
                }
                else {
                    return response.data
                        .filter((event) => {
                        if (includeNonNY) {
                            return !event.facilitator_only;
                        }
                        else {
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
