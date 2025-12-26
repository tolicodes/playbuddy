import { API_BASE_URL } from "../config";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ImportSource } from "../types/commonTypes";

export const useImportSources = () => {
    return useQuery({
        queryKey: ['import_sources'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE_URL}/import_sources`);
            return res.data as ImportSource[];
        }
    });
}
