import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchWishlistByCode = (shareCode) => {
    return useQuery({
        queryKey: ['wishlist', shareCode],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/code/${shareCode}`);
            return response.data;
        }
    });
};
export const useFetchWishlistEntries = (options) => useQuery({
    queryKey: ['wishlist', 'entries'],
    queryFn: async () => {
        const response = await axios.get(`${API_BASE_URL}/wishlist?includeMeta=true`);
        const payload = response.data ?? [];
        return (Array.isArray(payload) ? payload : [])
            .map((entry) => {
            if (entry && typeof entry === 'object' && 'event_id' in entry) {
                const eventId = Number(entry.event_id);
                if (!Number.isFinite(eventId))
                    return null;
                return { event_id: eventId, created_at: entry.created_at ?? null };
            }
            const eventId = Number(entry);
            if (!Number.isFinite(eventId))
                return null;
            return { event_id: eventId, created_at: null };
        })
            .filter(Boolean);
    },
    ...options,
});
