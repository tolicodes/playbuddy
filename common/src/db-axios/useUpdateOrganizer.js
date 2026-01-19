import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
export const useUpdateOrganizer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { id, ...rest } = payload;
            const res = await axios.patch(`${API_BASE_URL}/organizers/${id}`, rest);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizers'] });
        }
    });
};
