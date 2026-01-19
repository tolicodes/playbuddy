import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useCreateWeeklyPicksBranchLink = () => {
    return useMutation({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/branch_links/weekly_picks`, payload ?? {});
            return response.data;
        }
    });
};
export const useFetchWeeklyPicksBranchLinkStatus = (options) => useQuery({
    queryKey: ["weekly-picks-branch-link-status"],
    queryFn: async () => {
        const response = await axios.get(`${API_BASE_URL}/branch_links/weekly_picks/status`);
        return response.data;
    },
    staleTime: 2000,
    ...options,
});
