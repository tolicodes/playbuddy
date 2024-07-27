import { useMutation, useQueryClient, MutationFunction } from '@tanstack/react-query';
import { supabase } from '../../Common/supabaseClient';
import { getUser } from '../hooks/useGetUser';
import { User } from '@supabase/supabase-js';

// Type definitions for mutation responses
interface MutationResponse {
  success: boolean;
  message?: string;
}

type FavoriteKinks = string[]
type Context = { previousFavoriteKinks?: FavoriteKinks };

const useOptimisticUpdate = (
  mutationFn: MutationFunction<MutationResponse, string>,
  updateCacheFn: (old: FavoriteKinks, kinkId: string) => FavoriteKinks
) => {
  const queryClient = useQueryClient();

  return useMutation<MutationResponse, Error, string, Context>({
    mutationFn,
    onMutate: async (kinkId: string) => {
      const user = queryClient.getQueryData<User>(['user']);
      const userId = user?.id;

      if (!user) {
        throw new Error('User not found');
      }

      await queryClient.cancelQueries({ queryKey: ['favoriteKinks', userId] });

      const previousFavoriteKinks = queryClient.getQueryData<FavoriteKinks>(['favoriteKinks', userId]);

      queryClient.setQueryData<FavoriteKinks>(['favoriteKinks', userId], old =>
        updateCacheFn(old || [], kinkId)
      );

      return { previousFavoriteKinks };
    },
    onError: (err, kinkId, context) => {
      const user = queryClient.getQueryData<User>(['user']);
      const userId = user?.id;

      if (!user) {
        throw new Error('User not found');
      }

      if (context?.previousFavoriteKinks) {
        queryClient.setQueryData(['favoriteKinks', userId], context.previousFavoriteKinks);
      }
    },
    onSettled: () => {
      const user = queryClient.getQueryData<User>(['user']);
      const userId = user?.id;

      if (!user) {
        throw new Error('User not found');
      }

      queryClient.invalidateQueries({ queryKey: ['favoriteKinks', userId] });
    },
  });
};

// Function to add a favorite kink for the authenticated user
const addFavoriteKink = async (kinkId: string): Promise<MutationResponse> => {
  const user = await getUser();

  const { error } = await supabase
    .from('favorites')
    .insert([{ profile_id: user.id, kink_id: kinkId }]);

  if (error) {
    throw new Error('Error adding favorite kink: ' + error.message);
  }

  return { success: true };
};

// Function to remove a favorite kink for the authenticated user
const removeFavoriteKink = async (kinkId: string): Promise<MutationResponse> => {
  const user = await getUser();

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('profile_id', user.id)
    .eq('kink_id', kinkId);

  if (error) {
    throw new Error('Error removing favorite kink: ' + error.message);
  }

  return { success: true };
};

export const useAddFavoriteKink = () => {
  return useOptimisticUpdate(
    addFavoriteKink,
    (old, kinkId) => [...old, kinkId]
  );
};

export const useRemoveFavoriteKink = () => {
  return useOptimisticUpdate(
    removeFavoriteKink,
    (old, kinkId) => old.filter(oldKinkId => oldKinkId !== kinkId)
  );
};
