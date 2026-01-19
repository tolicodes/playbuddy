import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
export const useCreateImportSource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await axios.post(`${API_BASE_URL}/import_sources`, payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        }
    });
};
