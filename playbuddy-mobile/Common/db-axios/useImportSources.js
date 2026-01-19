import { API_BASE_URL } from "../config";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
export const useImportSources = ({ includeAll = false, enabled = true, } = {}) => {
    return useQuery({
        queryKey: ['import_sources', { includeAll }],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE_URL}/import_sources`, {
                params: includeAll ? { includeAll: true } : undefined,
            });
            return res.data;
        },
        enabled,
    });
};
