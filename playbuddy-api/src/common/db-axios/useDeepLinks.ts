import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DeepLink } from "../types/commonTypes";
import { API_BASE_URL } from "../config";

export const useFetchDeepLinks = () => {
    return useQuery({
        queryKey: ['deepLinks'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/deep-links`);
            return response.data as DeepLink[];
        }
    });
};

// ADMIN
export const useAddDeepLink = () => {
    return useMutation({
        mutationFn: async (deepLink: DeepLink) => {
            return (await axios.post(`${API_BASE_URL}/deep-links`, deepLink)).data as DeepLink;
        }
    });
}

export const useUpdateDeepLink = () => {
    return useMutation({
        mutationFn: async (updatedDeepLink: DeepLink) => {
            return (await axios.put(`${API_BASE_URL}/deep-links/${updatedDeepLink.id}`, updatedDeepLink)).data as DeepLink;
        }
    });
};

export const useDeleteDeepLink = () => {
    return useMutation({
        mutationFn: async (deepLinkId: string) => {
            return (await axios.delete(`${API_BASE_URL}/deep-links/${deepLinkId}`)).data as DeepLink;
        }
    });
};