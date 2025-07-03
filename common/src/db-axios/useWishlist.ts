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

export const useToggleWishlistEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ eventId, isOnWishlist }: { eventId: number, isOnWishlist: boolean }) => {
            await axios.put(`${API_BASE_URL}/events/weekly-picks/${eventId}`, {
                status: !isOnWishlist,
            });
            // Invalidate the "events" query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ["events"] });
        }
    });
}