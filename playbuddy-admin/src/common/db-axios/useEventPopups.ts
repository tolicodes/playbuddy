import { API_BASE_URL } from "../config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { EventPopup, EventPopupInput, EventPopupStatus } from "../types/commonTypes";

type FetchEventPopupsOptions = {
    status?: EventPopupStatus;
};

type UpdateEventPopupInput = Partial<Omit<EventPopupInput, 'id'>> & { id: string };

export const useFetchEventPopups = (options: FetchEventPopupsOptions = {}) => {
    const { status } = options;

    return useQuery<EventPopup[]>({
        queryKey: ['event_popups', { status: status ?? 'all' }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const response = await axios.get<EventPopup[]>(`${API_BASE_URL}/event_popups${queryString}`);
            return response.data;
        },
    });
};

export const useFetchActiveEventPopups = () => {
    return useQuery<EventPopup[]>({
        queryKey: ['event_popups', 'active'],
        queryFn: async () => {
            const response = await axios.get<EventPopup[]>(`${API_BASE_URL}/event_popups/active`);
            return response.data;
        },
    });
};

export const useCreateEventPopup = () => {
    const qc = useQueryClient();

    return useMutation<EventPopup, unknown, EventPopupInput>({
        mutationFn: async (payload: EventPopupInput) => {
            const response = await axios.post<EventPopup>(`${API_BASE_URL}/event_popups`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event_popups'] });
            qc.invalidateQueries({ queryKey: ['event_popups', 'active'] });
        },
    });
};

export const useUpdateEventPopup = () => {
    const qc = useQueryClient();

    return useMutation<EventPopup, unknown, UpdateEventPopupInput>({
        mutationFn: async ({ id, ...payload }: UpdateEventPopupInput) => {
            const response = await axios.patch<EventPopup>(`${API_BASE_URL}/event_popups/${id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event_popups'] });
            qc.invalidateQueries({ queryKey: ['event_popups', 'active'] });
        },
    });
};
