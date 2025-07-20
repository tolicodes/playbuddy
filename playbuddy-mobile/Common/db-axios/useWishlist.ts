import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export const useFetchWishlistByCode = (shareCode: string) => {
    return useQuery({
        queryKey: ['wishlist', shareCode],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/code/${shareCode}`);
            return response.data as number[];
        }
    });
}
