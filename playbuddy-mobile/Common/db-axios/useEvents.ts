import type { useQuery, useMutation } from "@tanstack/react-query";
import type { Event, NormalizedEventInput } from "../types/commonTypes";
import axios from "axios";
import { API_BASE_URL } from "../config";

export const useFetchEvents = ({
    includeFacilitatorOnly = false,
}: {
    includeFacilitatorOnly?: boolean;
} = {
        includeFacilitatorOnly: false,
    }) => {
    return useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: async () => {
            const response = await axios.get<Event[]>(API_BASE_URL + '/events').then((response: any) => {
                if (includeFacilitatorOnly) {
                    return response.data;
                } else {
                    return response.data.filter((event: any) => !event.facilitator_only);
                }
            });
            return response;
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
