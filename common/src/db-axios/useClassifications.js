import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useReclassifyEvents = () => {
    return useMutation({
        mutationFn: async ({ fields, eventIds, batchSize }) => {
            return axios.post(API_BASE_URL + "/classifications/reclassify", {
                fields,
                eventIds,
                batchSize,
            }).then((response) => response.data);
        },
    });
};
export const useReclassifyEstimate = () => {
    return useQuery({
        queryKey: ["reclassify-estimate"],
        queryFn: async () => {
            return axios
                .get(API_BASE_URL + "/classifications/reclassify/estimate")
                .then((response) => response.data);
        },
    });
};
