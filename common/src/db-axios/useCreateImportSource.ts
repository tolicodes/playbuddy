import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ImportSource } from "../types/commonTypes";

type CreatePayload = {
    source: string;
    method: string;
    identifier: string;
    identifier_type?: string;
    metadata?: Record<string, any>;
    event_defaults?: Record<string, any>;
};

export const useCreateImportSource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreatePayload) => {
            const res = await axios.post(`${API_BASE_URL}/import_sources`, payload);
            return res.data as ImportSource;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        }
    });
}
