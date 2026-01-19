import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchUsersOverTime = ({ startDate, endDate, } = {}) => useQuery({
    queryKey: ["analytics-users-over-time", startDate ?? null, endDate ?? null],
    queryFn: async () => {
        const params = {};
        if (startDate)
            params.startDate = startDate;
        if (endDate)
            params.endDate = endDate;
        const res = await axios.get(`${API_BASE_URL}/analytics/users-over-time`, { params });
        return res.data;
    },
    staleTime: 30000,
});
