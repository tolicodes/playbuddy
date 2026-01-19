import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useApproveImportSource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const res = await axios.post(`${API_BASE_URL}/import_sources/${id}/approve`);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        },
    });
};
