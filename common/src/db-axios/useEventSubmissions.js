import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useCreateEventSubmission = () => {
    return useMutation({
        mutationFn: async (payload) => {
            return axios
                .post(`${API_BASE_URL}/events/user-submissions`, payload)
                .then((response) => response.data);
        },
    });
};
export const useCreateEventSubmissionFromUrl = () => {
    return useMutation({
        mutationFn: async (payload) => {
            return axios
                .post(`${API_BASE_URL}/events/user-submissions/import-urls`, payload)
                .then((response) => response.data);
        },
    });
};
