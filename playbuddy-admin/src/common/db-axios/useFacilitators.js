import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
export const useFetchFacilitators = () => {
    return useQuery({
        queryKey: ['facilitators'],
        queryFn: async () => {
            return axios.get(API_BASE_URL + '/facilitators').then(response => response.data);
        },
    });
};
export const useFollowFacilitator = () => {
    return useMutation({
        mutationFn: async ({ facilitatorId }) => {
            return axios.post(API_BASE_URL + '/facilitators/follow', { facilitator_id: facilitatorId }).then(response => response.data);
        },
    });
};
export const useUnfollowFacilitator = () => {
    return useMutation({
        mutationFn: async ({ facilitatorId }) => {
            return axios.post(API_BASE_URL + '/facilitators/unfollow', { facilitator_id: facilitatorId }).then(response => response.data);
        },
    });
};
export const useFetchMyFacilitators = () => {
    return useQuery({
        queryKey: ['my-facilitators'],
        queryFn: async () => {
            return axios.get(API_BASE_URL + '/facilitators/my').then(response => response.data);
        },
    });
};
// ADMIN
export const useCreateFacilitator = () => {
    return useMutation({
        mutationFn: async (facilitator) => {
            return axios.post(API_BASE_URL + '/facilitators', facilitator).then(response => response.data);
        },
    });
};
export const useUpdateFacilitator = () => {
    return useMutation({
        mutationFn: async (facilitator) => {
            return axios.put(API_BASE_URL + `/facilitators/${facilitator.id}`, facilitator).then(response => response.data);
        },
    });
};
export const useDeleteFacilitator = () => {
    return useMutation({
        mutationFn: async (facilitatorId) => {
            return axios.delete(API_BASE_URL + `/facilitators/${facilitatorId}`).then(response => response.data);
        },
    });
};
export const useAddFacilitatorEvent = () => {
    return useMutation({
        mutationFn: async ({ facilitatorId, eventId }) => {
            return axios.post(`${API_BASE_URL}/facilitators/${facilitatorId}/events`, { event_id: eventId }).then(response => response.data);
        },
    });
};
export const useRemoveFacilitatorEvent = () => {
    return useMutation({
        mutationFn: async ({ facilitatorId, eventId }) => {
            return axios.delete(`${API_BASE_URL}/facilitators/${facilitatorId}/events/${eventId}`).then(response => response.data);
        },
    });
};
