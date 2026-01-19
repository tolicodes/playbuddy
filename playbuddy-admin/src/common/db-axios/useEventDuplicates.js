import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFindEventDuplicates = () => {
    return useMutation({
        mutationFn: async (payload) => {
            const res = await axios.post(`${API_BASE_URL}/events/duplicates`, payload);
            return res.data;
        },
    });
};
