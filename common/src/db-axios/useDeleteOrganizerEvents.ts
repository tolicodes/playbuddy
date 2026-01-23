import { API_BASE_URL } from "../config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

type DeleteOrganizerEventsResponse = {
    organizerId: number;
    deleted: number;
    skippedWithAttendees: number;
};

type DeleteOrganizerEventsPayload = {
    organizerId: number;
    onlyWithoutAttendees?: boolean;
};

export const useDeleteOrganizerEvents = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: DeleteOrganizerEventsPayload | number) => {
            const normalized = typeof payload === "number" ? { organizerId: payload } : payload;
            const params = normalized.onlyWithoutAttendees ? { onlyWithoutAttendees: "true" } : undefined;
            const res = await axios.delete(`${API_BASE_URL}/organizers/${normalized.organizerId}/events`, { params });
            return res.data as DeleteOrganizerEventsResponse;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['organizers'] });
            qc.invalidateQueries({ queryKey: ['events'] });
        }
    });
};
