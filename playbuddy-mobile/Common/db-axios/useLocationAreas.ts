import { API_BASE_URL } from "../config";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
    LocationArea,
    CreateLocationAreaInput,
    UpdateLocationAreaInput,
} from "../types/commonTypes";

export const useFetchLocationAreas = ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery<LocationArea[]>({
        queryKey: ["location_areas"],
        queryFn: async () => {
            const response = await axios.get<LocationArea[]>(`${API_BASE_URL}/location_areas`);
            const data = response.data ?? [];
            return [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        },
        enabled,
    });
};

export const useCreateLocationArea = () => {
    const queryClient = useQueryClient();
    return useMutation<LocationArea, unknown, CreateLocationAreaInput>({
        mutationFn: async (payload: CreateLocationAreaInput) => {
            const response = await axios.post<LocationArea>(`${API_BASE_URL}/location_areas`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["location_areas"] });
        },
    });
};

export const useUpdateLocationArea = () => {
    const queryClient = useQueryClient();
    return useMutation<LocationArea, unknown, UpdateLocationAreaInput>({
        mutationFn: async (payload: UpdateLocationAreaInput) => {
            const response = await axios.put<LocationArea>(`${API_BASE_URL}/location_areas/${payload.id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["location_areas"] });
        },
    });
};

export const useDeleteLocationArea = () => {
    const queryClient = useQueryClient();
    return useMutation<{ success: boolean }, unknown, string>({
        mutationFn: async (id: string) => {
            const response = await axios.delete<{ success: boolean }>(`${API_BASE_URL}/location_areas/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["location_areas"] });
        },
    });
};
