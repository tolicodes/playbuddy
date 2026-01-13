import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type ReclassifyField =
    | "type"
    | "short_description"
    | "tags"
    | "experience_level"
    | "interactivity_level"
    | "inclusivity"
    | "vetted"
    | "vetting_url"
    | "location"
    | "neighborhood"
    | "non_ny"
    | "hosts"
    | "price"
    | "short_price";

export type ReclassifyEventsResponse = {
    message: string;
    fields?: ReclassifyField[];
    eventIds?: Array<string | number>;
    count: number;
    futureOnly: boolean;
};

export type ReclassifyEstimateResponse = {
    count: number;
    futureOnly: boolean;
    generatedAt: string;
};

export const useReclassifyEvents = () => {
    return useMutation<
        ReclassifyEventsResponse,
        unknown,
        { fields?: ReclassifyField[]; eventIds?: Array<string | number>; batchSize?: number }
    >({
        mutationFn: async ({ fields, eventIds, batchSize }) => {
            return axios.post<ReclassifyEventsResponse>(API_BASE_URL + "/classifications/reclassify", {
                fields,
                eventIds,
                batchSize,
            }).then((response: any) => response.data);
        },
    });
};

export const useReclassifyEstimate = () => {
    return useQuery<ReclassifyEstimateResponse>({
        queryKey: ["reclassify-estimate"],
        queryFn: async () => {
            return axios
                .get<ReclassifyEstimateResponse>(API_BASE_URL + "/classifications/reclassify/estimate")
                .then((response: any) => response.data);
        },
    });
};
