import { API_BASE_URL } from "../config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
    PushNotification,
    PushNotificationInput,
    PushNotificationStatus,
} from "../types/commonTypes";

type FetchPushNotificationsOptions = {
    status?: PushNotificationStatus;
};

type UpdatePushNotificationInput = Partial<Omit<PushNotificationInput, "id">> & { id: string };

type FlushPushNotificationsResult = {
    processed: number;
    failed: number;
    errors: string[];
    notifications: PushNotification[];
};

export const useFetchPushNotifications = (options: FetchPushNotificationsOptions = {}) => {
    const { status } = options;

    return useQuery<PushNotification[]>({
        queryKey: ["push_notifications", { status: status ?? "all" }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            const queryString = params.toString() ? `?${params.toString()}` : "";
            const response = await axios.get<PushNotification[]>(`${API_BASE_URL}/push_notifications${queryString}`);
            return response.data;
        },
    });
};

export const useCreatePushNotification = () => {
    const qc = useQueryClient();

    return useMutation<PushNotification, unknown, PushNotificationInput>({
        mutationFn: async (payload: PushNotificationInput) => {
            const response = await axios.post<PushNotification>(`${API_BASE_URL}/push_notifications`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};

export const useUpdatePushNotification = () => {
    const qc = useQueryClient();

    return useMutation<PushNotification, unknown, UpdatePushNotificationInput>({
        mutationFn: async ({ id, ...payload }: UpdatePushNotificationInput) => {
            const response = await axios.patch<PushNotification>(`${API_BASE_URL}/push_notifications/${id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};

export const useSendPushNotification = () => {
    const qc = useQueryClient();

    return useMutation<PushNotification, unknown, { id: string }>({
        mutationFn: async ({ id }) => {
            const response = await axios.post<PushNotification>(`${API_BASE_URL}/push_notifications/${id}/send`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};

export const useFlushPushNotifications = () => {
    const qc = useQueryClient();

    return useMutation<FlushPushNotificationsResult, unknown, void>({
        mutationFn: async () => {
            const response = await axios.post<FlushPushNotificationsResult>(`${API_BASE_URL}/push_notifications/flush`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["push_notifications"] });
        },
    });
};
