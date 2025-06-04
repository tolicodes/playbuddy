import { API_BASE_URL } from "../config";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { PromoCode } from "../types/commonTypes";

export const useFetchPromoCodes = () => {
    return useQuery({
        queryKey: ['promoCodes'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/promo-codes`);
            return response.data as PromoCode[];
        }
    });
}