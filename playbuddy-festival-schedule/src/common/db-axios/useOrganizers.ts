import { API_BASE_URL } from "../config";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Organizer } from "../types/commonTypes";

export const useFetchOrganizers = () => {
    return useQuery({
        queryKey: ['organizers'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/organizers`);
            return response.data as Organizer[];
        }
    });
}