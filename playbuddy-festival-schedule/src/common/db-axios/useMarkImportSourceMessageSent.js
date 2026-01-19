import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useMarkImportSourceMessageSent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, message_sent }) => {
            const res = await axios.post(`${API_BASE_URL}/import_sources/${id}/message_sent`, { message_sent });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['import_sources'] });
        },
    });
};
