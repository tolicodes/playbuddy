import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchAnalyticsChart = ({ chartId, startDate, endDate, preset, limit, enabled = true, }) => useQuery({
    queryKey: ["analytics-chart", chartId, startDate ?? null, endDate ?? null, preset ?? null, limit ?? null],
    queryFn: async () => {
        const params = {};
        if (startDate)
            params.startDate = startDate;
        if (endDate)
            params.endDate = endDate;
        if (preset)
            params.preset = preset;
        if (limit)
            params.limit = String(limit);
        const res = await axios.get(`${API_BASE_URL}/analytics/charts/${chartId}`, { params });
        return res.data;
    },
    enabled: Boolean(chartId) && enabled,
    staleTime: 30000,
});
