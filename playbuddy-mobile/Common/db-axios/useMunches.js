import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchMunches = () => {
    return useQuery({
        queryKey: ['munches'],
        queryFn: async () => {
            return axios.get(API_BASE_URL + '/munches').then(response => response.data);
        },
    });
};
export const useUpdateMunch = () => {
    return useMutation({
        mutationFn: async (munch) => {
            return axios.put(API_BASE_URL + '/munches/' + munch.id, munch).then(response => response.data);
        },
    });
};
