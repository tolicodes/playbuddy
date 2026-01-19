import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useMergeEvent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await axios.post(`${API_BASE_URL}/events/merge`, payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["events"] });
        },
    });
};
