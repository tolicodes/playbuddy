import { API_BASE_URL } from "../config";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { PushToken, PushTokenInput } from "../types/commonTypes";

export const useRegisterPushToken = () => {
    return useMutation<PushToken, unknown, PushTokenInput>({
        mutationFn: async (payload: PushTokenInput) => {
            const response = await axios.post<PushToken>(`${API_BASE_URL}/push_tokens`, payload);
            return response.data;
        },
    });
};

export const useUnregisterPushToken = () => {
    return useMutation<{ success: boolean }, unknown, { token: string }>({
        mutationFn: async ({ token }) => {
            const response = await axios.delete<{ success: boolean }>(`${API_BASE_URL}/push_tokens`, {
                data: { token },
            });
            return response.data;
        },
    });
};
