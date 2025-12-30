import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ImportSource } from "../types/commonTypes";

type UpdatePayload = Partial<ImportSource> & {
    id?: string;
    source: string;
    method: string;
    identifier: string;
    identifier_type?: string | null;
    event_defaults?: Record<string, any>;
    metadata?: Record<string, any>;
    approval_status?: 'pending' | 'approved' | 'rejected' | null;
    message_sent?: boolean | null;
};

export const useUpdateImportSource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpdatePayload) => {
            const res = await axios.post(`${API_BASE_URL}/import_sources`, payload);
            return res.data as ImportSource;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        }
    });
}
