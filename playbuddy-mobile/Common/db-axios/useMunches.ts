import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Munch } from "../types/commonTypes";

export const useFetchMunches = () => {
    return useQuery<Munch[]>({
        queryKey: ['munches'],
        queryFn: async () => {
            try {
                const result = await axios.get<Munch[]>(API_BASE_URL + '/munches').then(response => response.data);
                console.log(result);
                return result;
            } catch (error) {
                console.error(error);
                return [];
            }
        },
    });
};