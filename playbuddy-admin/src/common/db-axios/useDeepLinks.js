import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchDeepLinks = () => {
    return useQuery({
        queryKey: ['deepLinks'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/deep_links`);
            return response.data;
        }
    });
};
// USER
export const useAddDeepLinkToUser = () => {
    return useMutation({
        mutationFn: async (deepLinkId) => {
            const response = await axios.post(`${API_BASE_URL}/me/deep-link`, {
                deep_link_id: deepLinkId,
            });
            return response.data;
        }
    });
};
// ADMIN
export const useAddDeepLink = () => {
    return useMutation({
        mutationFn: async (deepLink) => {
            return (await axios.post(`${API_BASE_URL}/deep_links`, deepLink)).data;
        }
    });
};
export const useUpdateDeepLink = () => {
    return useMutation({
        mutationFn: async (updatedDeepLink) => {
            return (await axios.put(`${API_BASE_URL}/deep_links/${updatedDeepLink.id}`, updatedDeepLink)).data;
        }
    });
};
export const useDeleteDeepLink = () => {
    return useMutation({
        mutationFn: async (deepLinkId) => {
            return (await axios.delete(`${API_BASE_URL}/deep_links/${deepLinkId}`)).data;
        }
    });
};
