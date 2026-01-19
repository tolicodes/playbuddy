import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchAnalyticsIndex = () => useQuery({
    queryKey: ["analytics-index"],
    queryFn: async () => {
        const res = await axios.get(`${API_BASE_URL}/analytics/index`);
        return res.data;
    },
    staleTime: 60000,
});
