import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Attendee, EventAttendees } from "../types/commonTypes";
import { API_BASE_URL } from "../config";

export const useFetchAttendees = () => {
    return useQuery({
        queryKey: ['attendees'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/attendees`);
            return response.data as EventAttendees[];
        }
    });
};
