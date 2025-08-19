import { API_BASE_URL } from "../config";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export const useCreateFacilitatorPrintRunDeepLinks = ({ campaignName, type, facilitatorId, mappings }: { campaignName: string, type: string, facilitatorId: string, mappings: any[] }) => {
    return useMutation({
        mutationFn: async () => {
            const payload = {
                campaign: campaignName,
                type,
                channel: 'business_card',
                facilitator_id: facilitatorId,
                deep_links: mappings.map((m) => ({
                    printRunAssetNumber: m.printRunAssetNumber,
                    slug: m.slug,
                })),
            };

            const response = await axios.post(`${API_BASE_URL}/marketing/print-run/facilitator`, payload);
            return response.data;
        }
    });
}