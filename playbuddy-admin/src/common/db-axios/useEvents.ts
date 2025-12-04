import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event, NormalizedEventInput } from "../types/commonTypes";
import axios from "axios";
import { API_BASE_URL } from "../config";

export const useFetchEvents = ({
    includeFacilitatorOnly = false,
    includeNonNY = false,
    includePrivate = false,
    includeHiddenOrganizers = false,
    includeHidden = false,
}: {
    includeFacilitatorOnly?: boolean;
    includeNonNY?: boolean;
    includePrivate?: boolean;
    includeHiddenOrganizers?: boolean;
    includeHidden?: boolean;
} = {
        includeFacilitatorOnly: false,
        includeNonNY: false,
        includePrivate: false,
        includeHiddenOrganizers: false,
        includeHidden: false,
    }) => {
    return useQuery<Event[]>({
        queryKey: ['events', { includeFacilitatorOnly, includeNonNY, includePrivate, includeHiddenOrganizers, includeHidden }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (includeHiddenOrganizers) params.set('includeHiddenOrganizers', 'true');
            if (includeHidden) params.set('includeHidden', 'true');
            if (includePrivate) params.set('visibility', 'private');

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
        mutationFn: async (urls: string[]) => {
            return axios.post(API_BASE_URL + '/events/import-urls', urls).then((response: any) => response.data);
        },
    });
}
