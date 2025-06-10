import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Event, NormalizedEventInput } from "../types/commonTypes";

export const useFetchEvents = () => {
    return useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: async () => {
            return axios.get<Event[]>(API_BASE_URL + '/events').then(response => response.data);
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