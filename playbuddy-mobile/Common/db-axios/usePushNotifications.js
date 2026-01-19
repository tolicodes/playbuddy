import { API_BASE_URL } from "../config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
export const useFetchPushNotifications = (options = {}) => {
    const { status } = options;
    return useQuery({
        queryKey: ["push_notifications", { status: status ?? "all" }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status)
                params.set("status", status);
            const queryString = params.toString() ? `?${params.toString()}` : "";
            const response = await axios.get(`${API_BASE_URL}/push_notifications${queryString}`);
            return response.data;
        },
    });
};
export const useCreatePushNotification = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/push_notifications`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};
export const useUpdatePushNotification = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }) => {
            const response = await axios.patch(`${API_BASE_URL}/push_notifications/${id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};
export const useSendPushNotification = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const response = await axios.post(`${API_BASE_URL}/push_notifications/${id}/send`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};
export const useFlushPushNotifications = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await axios.post(`${API_BASE_URL}/push_notifications/flush`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};
