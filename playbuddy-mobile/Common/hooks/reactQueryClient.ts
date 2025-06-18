import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Retry failed queries up to 3 times
            retry: 3,
        },
        mutations: {
            // Retry mutations up to 1 time on failure
            retry: 1,
        },
    },
});