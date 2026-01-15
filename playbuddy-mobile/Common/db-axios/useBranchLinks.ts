import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type WeeklyPicksBranchLinkRequest = {
    weekOffset?: number;
    title?: string;
    socialTitle?: string;
    socialDescription?: string;
    headless?: boolean;
};

export type WeeklyPicksBranchLinkResponse = {
    link: string | null;
    title: string;
    socialTitle: string;
    socialDescription: string;
    weekLabel: string;
    logs?: string[];
};

export type WeeklyPicksBranchLinkStatus = {
    status: "idle" | "running" | "completed" | "failed";
    startedAt?: string | null;
    finishedAt?: string | null;
    error?: string | null;
    logs?: string[];
    link?: string | null;
    title?: string;
    socialTitle?: string;
    socialDescription?: string;
    weekLabel?: string;
};

export const useCreateWeeklyPicksBranchLink = () => {
    return useMutation({
        mutationFn: async (payload?: WeeklyPicksBranchLinkRequest) => {
            const response = await axios.post(
                `${API_BASE_URL}/branch_links/weekly_picks`,
                payload ?? {}
            );
            return response.data as WeeklyPicksBranchLinkResponse;
        }
    });
};

export const useFetchWeeklyPicksBranchLinkStatus = (
    options?: Omit<UseQueryOptions<WeeklyPicksBranchLinkStatus>, 'queryKey' | 'queryFn'>
) =>
    useQuery<WeeklyPicksBranchLinkStatus>({
        queryKey: ["weekly-picks-branch-link-status"],
        queryFn: async () => {
            const response = await axios.get(
                `${API_BASE_URL}/branch_links/weekly_picks/status`
            );
            return response.data as WeeklyPicksBranchLinkStatus;
        },
        staleTime: 2_000,
        ...options,
    });
