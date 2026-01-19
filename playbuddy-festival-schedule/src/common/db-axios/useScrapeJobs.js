import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useScrapeJobs = () => useQuery({
    queryKey: ["scrape-jobs"],
    queryFn: async () => {
        const res = await axios.get(`${API_BASE_URL}/events/scrape-jobs`);
        return res.data.jobs || [];
    },
    staleTime: 30000,
});
