import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Event, NormalizedEventInput } from "../types/commonTypes";

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
            const response = await axios.get<Event[]>(API_BASE_URL + '/events').then(response => {
                if (includeFacilitatorOnly) {
                    return response.data;
                } else {
                    return response.data.filter(event => !event.facilitator_only);
                }
            });
            return response;
        },
    });
};

export const useCreateEvent = () => {
    return useMutation<Event, unknown, NormalizedEventInput>({
        mutationFn: async (event: NormalizedEventInput) => {
            return axios.post<Event>(API_BASE_URL + '/events', event).then(response => response.data);
        },
    });
};