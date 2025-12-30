import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { ImportSource } from "../types/commonTypes";

export const useMarkImportSourceMessageSent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, message_sent }: { id: string; message_sent: boolean }) => {
            const res = await axios.post<ImportSource>(`${API_BASE_URL}/import_sources/${id}/message_sent`, { message_sent });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        },
    });
};
