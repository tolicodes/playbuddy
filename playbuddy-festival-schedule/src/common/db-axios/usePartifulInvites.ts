import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type PartifulAuthStatus = {
    authenticated: boolean;
    pendingCode: boolean;
    hasState: boolean;
    userId?: string | null;
    amplitudeDeviceId?: string | null;
    hasWelcomeBack?: boolean;
};

export type PartifulAuthStartResult = {
    status: "authenticated" | "code_required";
    message?: string;
};

export type PartifulAuthCompleteResult = {
    status: "authenticated";
    userId?: string | null;
    amplitudeDeviceId?: string | null;
};

export type PartifulInviteOverrides = {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    timezone?: string;
    location?: string;
};

export type PartifulInviteRequest = {
    eventId: number;
    overrides?: PartifulInviteOverrides;
};

export type PartifulInviteResponse = {
    eventId: number;
    partifulId: string;
    url: string;
};

const AUTH_STATUS_QUERY_KEY = ["partiful-auth-status"];

export const useFetchPartifulAuthStatus = () => {
    return useQuery<PartifulAuthStatus>({
        queryKey: AUTH_STATUS_QUERY_KEY,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/partiful/auth/status`);
            return response.data as PartifulAuthStatus;
        },
    });
};

export const useStartPartifulAuth = () => {
    const queryClient = useQueryClient();
    return useMutation<PartifulAuthStartResult, unknown, { force?: boolean; phone?: string; headless?: boolean }>({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/partiful/auth/start`, payload || {});
            return response.data as PartifulAuthStartResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
        },
    });
};

export const useCompletePartifulAuth = () => {
    const queryClient = useQueryClient();
    return useMutation<PartifulAuthCompleteResult, unknown, { code: string }>({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/partiful/auth/verify`, payload);
            return response.data as PartifulAuthCompleteResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
        },
    });
};

export const useCreatePartifulInvite = () => {
    return useMutation<PartifulInviteResponse, unknown, PartifulInviteRequest>({
        mutationFn: async (payload) => {
            const response = await axios.post(`${API_BASE_URL}/partiful/invites`, payload);
            return response.data as PartifulInviteResponse;
        },
    });
};
