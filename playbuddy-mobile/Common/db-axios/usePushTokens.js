import { API_BASE_URL } from "../config";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
export const useRegisterPushToken = () => {
    return useMutation({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/push_tokens`, payload);
            return response.data;
        },
    });
};
export const useUnregisterPushToken = () => {
    return useMutation({
        mutationFn: async ({ token }) => {
            const response = await axios.delete(`${API_BASE_URL}/push_tokens`, {
                data: { token },
            });
            return response.data;
        },
    });
};
