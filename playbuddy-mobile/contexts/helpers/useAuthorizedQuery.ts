import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useUserContext } from "../UserContext";

export const useAuthorizedQuery = <TData>(params: UseQueryOptions<TData>) => {
    const { authUserId } = useUserContext();

    return useQuery({
        ...params,
        enabled: !!authUserId, // Enable only when authUserId is present
    });
};