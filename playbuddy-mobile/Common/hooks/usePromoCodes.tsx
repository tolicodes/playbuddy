import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { PromoCode } from "../../commonTypes";

export const useFetchPromoCodes = () => {
    return useQuery({
        queryKey: ['promoCodes'],
        queryFn: async () => {
            return (await axios.get(`${API_BASE_URL}/promo_codes`)).data;
        }
    });
};

export const useAddPromoCode = () => {
    return useMutation({
        mutationFn: async (promoCode: PromoCode) => {
            return (await axios.post(`${API_BASE_URL}/promo_codes`, promoCode)).data;
        }
    });
}

export const useUpdatePromoCode = () => {
    return useMutation({
        mutationFn: async (updatedPromoCode: PromoCode) => {
            return (await axios.put(`${API_BASE_URL}/promo_codes/${updatedPromoCode.id}`, updatedPromoCode)).data;
        }
    });
};

export const useDeletePromoCode = () => {
    return useMutation({
        mutationFn: async (promoCodeId: string) => {
            return (await axios.delete(`${API_BASE_URL}/promo_codes/${promoCodeId}`)).data;
        }
    });
};