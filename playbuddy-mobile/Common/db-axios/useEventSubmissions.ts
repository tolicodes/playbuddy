import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { Event, UserSubmittedEventInput } from "../types/commonTypes";

export type UserSubmittedEventResponse = {
    result: 'inserted' | 'updated' | 'failed' | 'skipped';
    event: Event | null;
    skip?: {
        reason: string;
        detail?: string;
        code?: "organizer_hidden" | "event_frozen" | "existing_event";
        eventId?: string;
    };
};

export type UserSubmittedImportResponse = {
    requested: number;
    scraped: number;
    events: UserSubmittedEventResponse[];
};

export type UserSubmittedUrlPayload = {
    url?: string;
    urls?: string[];
};

export const useCreateEventSubmission = () => {
    return useMutation<UserSubmittedEventResponse, unknown, UserSubmittedEventInput>({
        mutationFn: async (payload: UserSubmittedEventInput) => {
            return axios
                .post<UserSubmittedEventResponse>(`${API_BASE_URL}/events/user-submissions`, payload)
                .then((response: any) => response.data);
        },
    });
};

export const useCreateEventSubmissionFromUrl = () => {
    return useMutation<UserSubmittedImportResponse, unknown, UserSubmittedUrlPayload>({
        mutationFn: async (payload: UserSubmittedUrlPayload) => {
            return axios
                .post<UserSubmittedImportResponse>(`${API_BASE_URL}/events/user-submissions/import-urls`, payload)
                .then((response: any) => response.data);
        },
    });
};
