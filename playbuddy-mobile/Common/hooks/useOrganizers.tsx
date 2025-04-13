import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { Organizer } from "../../../common/types/commonTypes";

export const useFetchOrganizers = () => {
    return useQuery({
        queryKey: ['organizers'],
        queryFn: async () => {
            return (await axios.get(`${API_BASE_URL}/organizers`)).data as Organizer[];
        }
    });
};  