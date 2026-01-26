import { API_BASE_URL } from "../config";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
    PromoCodeRedemption,
    PromoCodeRedemptionStats,
    PromoCodeRedemptionSummary,
    CreatePromoCodeRedemptionInput,
    PromoCodeRedemptionImportRequest,
    PromoCodeRedemptionImportResult,
} from "../types/commonTypes";

export const useFetchPromoCodeRedemptionSummary = (organizerId?: string | number | null) => {
    return useQuery({
        queryKey: ["promoCodeRedemptionSummary", organizerId ?? null],
        enabled: !!organizerId,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/promo_codes/redemptions/summary`, {
                params: { organizer_id: organizerId },
            });
            return response.data as PromoCodeRedemptionSummary[];
        },
    });
};

export const useFetchPromoCodeRedemptions = (promoCodeId?: string | null) => {
    return useQuery({
        queryKey: ["promoCodeRedemptions", promoCodeId ?? null],
        enabled: !!promoCodeId,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/promo_codes/${promoCodeId}/redemptions`);
            return response.data as PromoCodeRedemption[];
        },
    });
};

export const useFetchPromoCodeRedemptionStats = (promoCodeId?: string | null) => {
    return useQuery({
        queryKey: ["promoCodeRedemptionStats", promoCodeId ?? null],
        enabled: !!promoCodeId,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/promo_codes/${promoCodeId}/redemptions/stats`);
            return response.data as PromoCodeRedemptionStats;
        },
    });
};

export const useCreatePromoCodeRedemption = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            promoCodeId,
            payload,
        }: {
            promoCodeId: string;
            payload: Omit<CreatePromoCodeRedemptionInput, "promo_code_id">;
        }) => {
            const response = await axios.post(`${API_BASE_URL}/promo_codes/${promoCodeId}/redemptions`, payload);
            queryClient.invalidateQueries({ queryKey: ["promoCodeRedemptions", promoCodeId] });
            queryClient.invalidateQueries({ queryKey: ["promoCodeRedemptionStats", promoCodeId] });
            queryClient.invalidateQueries({ queryKey: ["promoCodeRedemptionSummary"] });
            return response.data as PromoCodeRedemption[];
        },
    });
};

export const useImportPromoCodeRedemptions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: PromoCodeRedemptionImportRequest) => {
            const response = await axios.post(`${API_BASE_URL}/promo_codes/redemptions/import`, payload);
            queryClient.invalidateQueries({ queryKey: ["promoCodeRedemptionSummary"] });
            if (payload?.promo_code_id) {
                queryClient.invalidateQueries({ queryKey: ["promoCodeRedemptions", payload.promo_code_id] });
                queryClient.invalidateQueries({ queryKey: ["promoCodeRedemptionStats", payload.promo_code_id] });
            }
            return response.data as PromoCodeRedemptionImportResult;
        },
    });
};
