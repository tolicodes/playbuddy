import { API_BASE_URL } from "../config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
export const useFetchEventPopups = (options = {}) => {
    const { status } = options;
    return useQuery({
        queryKey: ['event_popups', { status: status ?? 'all' }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status)
                params.set('status', status);
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const response = await axios.get(`${API_BASE_URL}/event_popups${queryString}`);
            return response.data;
        },
    });
};
export const useFetchActiveEventPopups = () => {
    return useQuery({
        queryKey: ['event_popups', 'active'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/event_popups/active`);
            return response.data;
        },
    });
};
export const useCreateEventPopup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/event_popups`, payload);
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
    return useMutation({
        mutationFn: async ({ id, ...payload }) => {
            const response = await axios.patch(`${API_BASE_URL}/event_popups/${id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event_popups'] });
            qc.invalidateQueries({ queryKey: ['event_popups', 'active'] });
        },
    });
};
export const useResendEventPopup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const response = await axios.post(`${API_BASE_URL}/event_popups/${id}/resend`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event_popups'] });
            qc.invalidateQueries({ queryKey: ['event_popups', 'active'] });
        },
    });
};
