import { API_BASE_URL } from "../config";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
export const useTags = () => {
    return useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/tags`);
            return response.data;
        }
    });
};
export const useCreateTag = () => {
    return useMutation({
        mutationFn: async (tag) => {
            const response = await axios.post(`${API_BASE_URL}/tags`, tag);
            return response.data;
        }
    });
};
