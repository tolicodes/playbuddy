import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchBranchStats = () => useQuery({
    queryKey: ["branch-stats"],
    queryFn: async () => {
        const res = await axios.get(`${API_BASE_URL}/branch_stats`);
        return res.data;
    },
    staleTime: 30000,
});
export const useFetchBranchStatsScrapeStatus = () => useQuery({
    queryKey: ["branch-stats-scrape-status"],
    queryFn: async () => {
        const res = await axios.get(`${API_BASE_URL}/branch_stats/scrape/status`);
        return res.data;
    },
    staleTime: 2000,
});
export const useCreateBranchStatsScrape = () => useMutation({
    mutationFn: async (payload) => {
        const res = await axios.post(`${API_BASE_URL}/branch_stats/scrape`, payload || {});
        return res.data;
    },
});
