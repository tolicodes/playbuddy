import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { EventDuplicateRequest, EventDuplicateResponse } from "../types/commonTypes";

export const useFindEventDuplicates = () => {
    return useMutation<EventDuplicateResponse, unknown, EventDuplicateRequest>({
        mutationFn: async (payload: EventDuplicateRequest) => {
            const res = await axios.post(`${API_BASE_URL}/events/duplicates`, payload);
            return res.data as EventDuplicateResponse;
        },
    });
};
