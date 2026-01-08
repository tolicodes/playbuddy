import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Organizer } from "../types/commonTypes";

type MergePayload = {
    sourceOrganizerId: number;
    targetOrganizerId: number;
    deleteSource?: boolean;
};

type MergeResponse = {
    organizer: Organizer;
    warnings?: { table: string; message: string }[];
};

export const useMergeOrganizer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: MergePayload) => {
            const res = await axios.post(`${API_BASE_URL}/organizers/merge`, payload);
            return res.data as MergeResponse;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizers'] });
            qc.invalidateQueries({ queryKey: ['events'] });
        }
    });
};
