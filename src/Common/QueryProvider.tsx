// QueryProvider.tsx
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1, // Retry failed requests once
            refetchOnWindowFocus: false, // Do not refetch when window regains focus
        },
    },
});

interface QueryProviderProps {
    children: ReactNode;
}

const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

export default QueryProvider;
