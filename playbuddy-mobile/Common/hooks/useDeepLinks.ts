import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../../config";

export const useFetchDeepLinks = () => {
    const { data: deepLinks = [], isLoading: isLoadingDeepLinks } = useQuery({
        queryKey: ['deepLinks'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/common/deep-links`);
                return response.data;
            } catch (error) {
                throw new Error('Failed to fetch deep links', { cause: error });
            }
        }
    });
    return { data: deepLinks, isLoading: isLoadingDeepLinks };
};

export const useAddDeepLinkToUser = (deepLinkId: string) => {
    const { mutate: addDeepLinkToUser } = useMutation({
        mutationFn: async () => {
            const response = await axios.post(`${API_BASE_URL}/me/add-deep-link`, { deepLinkId });
            return response.data;
        }
    });

    return { mutate: addDeepLinkToUser };
}