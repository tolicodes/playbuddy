import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Munch } from "../types/commonTypes";

export const useFetchMunches = () => {
    return useQuery<Munch[]>({
        queryKey: ['munches'],
        queryFn: async () => {
            return axios.get<Munch[]>(API_BASE_URL + '/munches').then(response => response.data);
        },
    });
};

export const useUpdateMunch = () => {
    return useMutation<Partial<Munch>, unknown, Partial<Munch>>({
        mutationFn: async (munch: Partial<Munch>) => {
            return axios.put<Munch>(API_BASE_URL + '/munches/' + munch.id, munch).then(response => response.data);
        },
    });
};