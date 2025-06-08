import { API_BASE_URL } from "../config";
import { useQuery, useMutation } from "@tanstack/react-query";
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

export const useCreatePromoCode = () => {
    return useMutation({
        mutationFn: async (promoCode: PromoCode) => {
            const response = await axios.post(`${API_BASE_URL}/promo-codes`, promoCode);
            return response.data as PromoCode;
        }
    });
}

export const useUpdatePromoCode = () => {
    return useMutation({
        mutationFn: async (promoCode: PromoCode) => {
            const response = await axios.put(`${API_BASE_URL}/promo-codes/${promoCode.id}`, promoCode);
            return response.data as PromoCode;
        }
    });
}

export const useDeletePromoCode = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await axios.delete(`${API_BASE_URL}/promo-codes/${id}`);
            return response.data as PromoCode;
        }
    });
}
