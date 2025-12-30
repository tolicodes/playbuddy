import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { ImportSource } from "../types/commonTypes";

export const useApproveImportSource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await axios.post<ImportSource>(`${API_BASE_URL}/import_sources/${id}/approve`);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        },
    });
};
