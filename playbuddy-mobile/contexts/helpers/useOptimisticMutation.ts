import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';

export interface UseOptimisticMutationOptions<TUpdateData, TData, TVariables, TError = Error>
    extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onMutate' | 'mutationFn'> {
    queryKey: QueryKey;
    mutationFn: (variables: TVariables) => Promise<TData>;
    onMutateFn: (previousData: TUpdateData | undefined, variables: TVariables) => TUpdateData | undefined;
}

// Optimistic mutation hook with rollback mechanism
export const useOptimisticMutation = <TUpdateData, TData, TVariables, TError = Error>({
    mutationFn,
    queryKey,
    onMutateFn,
    ...mutationOptions
}: UseOptimisticMutationOptions<TUpdateData, TData, TVariables, TError>) => {
    const queryClient = useQueryClient();

    return useMutation<TData, TError, TVariables, { previousData: TUpdateData | undefined }>({
        mutationFn: async (variables) => {
            const data = await mutationFn(variables);
            return data;
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey });

            const previousData = queryClient.getQueryData<TUpdateData>(queryKey);

            const updatedData = onMutateFn(previousData, variables);
            queryClient.setQueryData<TUpdateData>(queryKey, updatedData);

            return { previousData };
        },
        onError: (error, variables, context) => {
            if (context?.previousData !== undefined) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        ...mutationOptions,
    });
};
