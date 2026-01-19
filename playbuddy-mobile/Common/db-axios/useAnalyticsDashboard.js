import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchAnalyticsDashboard = ({ startDate, endDate, } = {}) => useQuery({
    queryKey: ["analytics-dashboard", startDate ?? null, endDate ?? null],
    queryFn: async () => {
        const params = {};
        if (startDate)
            params.startDate = startDate;
        if (endDate)
            params.endDate = endDate;
        const res = await axios.get(`${API_BASE_URL}/analytics/dashboard`, { params });
        return res.data;
    },
    staleTime: 30000,
});
