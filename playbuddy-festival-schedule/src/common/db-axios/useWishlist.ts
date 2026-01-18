import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type WishlistEntry = {
    event_id: number;
    created_at: string | null;
};

export const useFetchWishlistByCode = (shareCode: string) => {
    return useQuery({
        queryKey: ['wishlist', shareCode],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/code/${shareCode}`);
            return response.data as number[];
        }
    });
};

export const useFetchWishlistEntries = (
    options?: Omit<UseQueryOptions<WishlistEntry[]>, 'queryKey' | 'queryFn'>
) =>
    useQuery<WishlistEntry[]>({
        queryKey: ['wishlist', 'entries'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist?includeMeta=true`);
            const payload = response.data ?? [];
            return (Array.isArray(payload) ? payload : [])
                .map((entry: any) => {
                    if (entry && typeof entry === 'object' && 'event_id' in entry) {
                        const eventId = Number(entry.event_id);
                        if (!Number.isFinite(eventId)) return null;
                        return { event_id: eventId, created_at: entry.created_at ?? null };
                    }
                    const eventId = Number(entry);
                    if (!Number.isFinite(eventId)) return null;
                    return { event_id: eventId, created_at: null };
                })
                .filter(Boolean) as WishlistEntry[];
        },
        ...options,
    });
