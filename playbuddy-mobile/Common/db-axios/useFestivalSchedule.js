import { useQuery } from "@tanstack/react-query";
import axios from "axios";
const DO_SCHEDULE_URL = 'https://playbuddy.me/misc/do_summer_camp_2025.json';
export const useFetchDoFestivalSchedule = () => {
    return useQuery({
        queryKey: ['doFestivalSchedule'],
        queryFn: async () => {
            const response = await axios.get(DO_SCHEDULE_URL);
            return response.data;
        }
    });
};
