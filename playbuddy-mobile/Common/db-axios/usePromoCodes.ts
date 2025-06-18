import { API_BASE_URL } from "../config";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { PromoCode } from "../types/commonTypes";

export const useFetchPromoCodes = () => {
    return useQuery({
        queryKey: ['promoCodes'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/promo_codes`);
            return response.data as PromoCode[];
        }
    });
}

export const useCreatePromoCode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (promoCode: PromoCode) => {
            const response = await axios.post(`${API_BASE_URL}/promo_codes`, promoCode);
            queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
            return response.data as PromoCode;
        }
    });
}

export const useUpdatePromoCode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (promoCode: PromoCode) => {
            const response = await axios.put(`${API_BASE_URL}/promo_codes/${promoCode.id}`, promoCode);
            queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
            return response.data as PromoCode;
        }
    });
}

export const useDeletePromoCode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await axios.delete(`${API_BASE_URL}/promo_codes/${id}`);
            queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
            return response.data as PromoCode;
        }
    });
}


export const useAddPromoCodeToEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ promoCodeId, eventId }: { promoCodeId: string, eventId: string }) => {
            const response = await axios.post(`${API_BASE_URL}/promo_codes/events`, {
                promo_code_id: promoCodeId,
                event_id: eventId
            });

            // Invalidate the events query
            queryClient.invalidateQueries({ queryKey: ['events'] });

            return response.data as PromoCode;
        }
    });
}

export const useDeletePromoCodeFromEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ promoCodeId, eventId }: { promoCodeId: string, eventId: string }) => {
            const response = await axios.delete(`${API_BASE_URL}/promo_codes/events`, {
                data: {
                    event_id: eventId,
                    promo_code_id: promoCodeId
                }
            });

            // Invalidate the events query
            queryClient.invalidateQueries({ queryKey: ['events'] });

            return response.data as PromoCode;
        }
    });
}