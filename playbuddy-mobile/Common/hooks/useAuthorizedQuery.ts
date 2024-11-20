import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";

export const useAuthorizedQuery = <TData>(params: UseQueryOptions<TData>) => {
    const { authUserId } = useUserContext();

    return useQuery({
        ...params,
        enabled: !!authUserId, // Enable only when authUserId is present
    });
};
