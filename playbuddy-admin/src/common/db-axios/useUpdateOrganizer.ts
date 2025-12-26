import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Organizer } from "../types/commonTypes";

type UpdatePayload = Partial<Organizer> & { id: number };

export const useUpdateOrganizer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpdatePayload) => {
            const { id, ...rest } = payload;
            const res = await axios.patch(`${API_BASE_URL}/organizers/${id}`, rest);
            return res.data as Organizer;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizers'] });
        }
    });
}
