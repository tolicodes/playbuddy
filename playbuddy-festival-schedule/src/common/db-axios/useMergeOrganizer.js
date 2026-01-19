import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
export const useMergeOrganizer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await axios.post(`${API_BASE_URL}/organizers/merge`, payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizers'] });
            qc.invalidateQueries({ queryKey: ['events'] });
        }
    });
};
