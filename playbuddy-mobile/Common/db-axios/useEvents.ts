import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Event } from "../types/commonTypes";

export const useFetchEvents = () => {
    return useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: async () => {
            return axios.get<Event[]>(API_BASE_URL + '/events').then(response => response.data);
        },
    });
};