import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { MergeEventRequest, MergeEventResponse } from "../types/commonTypes";

export const useMergeEvent = () => {
    const qc = useQueryClient();
    return useMutation<MergeEventResponse, unknown, MergeEventRequest>({
        mutationFn: async (payload: MergeEventRequest) => {
            const res = await axios.post(`${API_BASE_URL}/events/merge`, payload);
            return res.data as MergeEventResponse;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["events"] });
        },
    });
};
