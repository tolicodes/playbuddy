import { API_BASE_URL } from "../config";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Organizer } from "../types/commonTypes";

export const useFetchOrganizers = ({ includeHidden = false }: { includeHidden?: boolean } = {}) => {
    return useQuery({
        queryKey: ['organizers', { includeHidden }],
        queryFn: async () => {
            const params = includeHidden ? '?includeHidden=true' : '';
            const url = `${API_BASE_URL}/organizers${params}`;
            const response = await axios.get(url);
            const data = response.data as any[];
            const sorted = [...data].sort((a, b) => {
                const aCount = a.events?.[0]?.count ?? a.events_count ?? 0;
                const bCount = b.events?.[0]?.count ?? b.events_count ?? 0;
                return bCount - aCount;
            });
            if (__DEV__) {
                const sample = sorted.slice(0, 3).map((organizer) => ({
                    id: organizer.id,
                    name: organizer.name,
                    hidden: organizer.hidden,
                }));
                console.log('[organizers][fetch]', {
                    url,
                    total: sorted.length,
                    sample,
                });
            }
            return sorted as Organizer[];
        }
    });
}
