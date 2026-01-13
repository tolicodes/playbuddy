import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DeepLinkInput, DeepLink } from "../types/commonTypes";
import { API_BASE_URL } from "../config";

export const useFetchDeepLinks = () => {
    return useQuery({
        queryKey: ['deepLinks'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/deep_links`);
            return response.data as DeepLink[];
        }
    });
};

// USER
export const useAddDeepLinkToUser = () => {
    return useMutation({
        mutationFn: async (deepLinkId: string) => {
            const response = await axios.post(`${API_BASE_URL}/me/deep-link`, {
                deep_link_id: deepLinkId,
            });
            return response.data;
        }
    });
}

// ADMIN
export const useAddDeepLink = () => {
    return useMutation({
        mutationFn: async (deepLink: DeepLinkInput) => {
            return (await axios.post(`${API_BASE_URL}/deep_links`, deepLink)).data as DeepLink;
        }
    });
}

export const useUpdateDeepLink = () => {
    return useMutation({
        mutationFn: async (updatedDeepLink: DeepLinkInput) => {
            return (await axios.put(`${API_BASE_URL}/deep_links/${updatedDeepLink.id}`, updatedDeepLink)).data as DeepLink;
        }
    });
};

export const useDeleteDeepLink = () => {
    return useMutation({
        mutationFn: async (deepLinkId: string) => {
            return (await axios.delete(`${API_BASE_URL}/deep_links/${deepLinkId}`)).data as DeepLink;
        }
    });
};
