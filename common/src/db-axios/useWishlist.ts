import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export const useTags = (shareCode: string) => {
    return useQuery({
        queryKey: ['wishlist', shareCode],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/code/${shareCode}`);
            return response.data as string[];
        }
    });
}