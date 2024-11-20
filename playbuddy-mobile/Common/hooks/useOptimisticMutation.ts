import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';

export interface UseOptimisticMutationOptions<TUpdateData, TData, TVariables, TError = Error>
    extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onMutate' | 'mutationFn'> {
    queryKey: QueryKey;
    mutationFn: (variables: TVariables) => Promise<TData>;
    onMutateFn: (previousData: TUpdateData | undefined, variables: TVariables) => TUpdateData | undefined;
}

// Optimistic mutation hook with rollback mechanism
export const useOptimisticMutation = <TQueryData, TMutateData, TVariables, TError = Error>({
    mutationFn,
    queryKey,
    onMutateFn,
    ...mutationOptions
}: UseOptimisticMutationOptions<TQueryData, TMutateData, TVariables, TError>) => {
    const queryClient = useQueryClient();

    return useMutation<TMutateData, TError, TVariables, { previousData: TQueryData | undefined }>({
        mutationFn: async (variables: TVariables) => {
            const data = await mutationFn(variables);
            return data;
        },
        onMutate: async (variables: TVariables) => {
            await queryClient.cancelQueries({ queryKey });

            const previousData = queryClient.getQueryData<TQueryData>(queryKey);

            const updatedData = onMutateFn(previousData, variables);
            queryClient.setQueryData<TQueryData>(queryKey, updatedData);

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
