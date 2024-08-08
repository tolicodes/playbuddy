import { useMutation, useQueryClient, MutationFunction } from '@tanstack/react-query';
import { supabase } from '../../../Common/supabaseClient';
import { getUser } from '../../hooks/useGetUser';
import { User } from '@supabase/supabase-js';

// Type definitions for mutation responses
interface MutationResponse {
  success: boolean;
  message?: string;
}

interface UserKinkData {
  kink_id: string;
  is_favorite: boolean;
}

type UserKinkMetadata = UserKinkData[];
type Context = { previousUserKinkMetadata?: UserKinkMetadata };



const useOptimisticUpdate = (
  mutationFn: MutationFunction<MutationResponse, string>,
  updateCacheFn: (old: UserKinkMetadata, kinkId: string) => UserKinkMetadata
) => {
  const queryClient = useQueryClient();

  const getUserId = () => {
    const user = queryClient.getQueryData<User>(['user']);

    if (!user) {
      throw new Error('User not found');
    }

    return user?.id;
  }

  const cancelQueries = async (userId: string) => {
    await queryClient.cancelQueries({ queryKey: ['userKinkMetadata', userId] });
  }

  return useMutation<MutationResponse, Error, string, Context>({
    mutationFn,
    onMutate: async (kinkId: string) => {
      const userId = getUserId();
      await cancelQueries(userId);

      const previousUserKinkMetadata = queryClient.getQueryData<UserKinkMetadata>(['userKinkMetadata', userId]);

      queryClient.setQueryData<UserKinkMetadata>(['userKinkMetadata', userId], old =>
        updateCacheFn(old || [], kinkId)
      );

      return { previousUserKinkMetadata };
    },
    onError: (err, kinkId, context) => {
      const userId = getUserId();

      if (context?.previousUserKinkMetadata) {
        queryClient.setQueryData(['userKinkMetadata', userId], context.previousUserKinkMetadata);
      }
    },
    onSettled: () => {
      const user = queryClient.getQueryData<User>(['user']);
      const userId = user?.id;

      if (!user) {
        throw new Error('User not found');
      }

      queryClient.invalidateQueries({ queryKey: ['userKinkMetadata', userId] });
    },
  });
};

// Function to add or update a favorite kink for the authenticated user
const upsertFavoriteKink = async (kinkId: string): Promise<MutationResponse> => {
  const user = await getUser();

  const { error } = await supabase
    .from('user_kink_data')
    .upsert({ user_id: user.id, kink_id: kinkId, is_favorite: true }, { onConflict: 'user_id,kink_id' });

  if (error) {
    throw new Error('Error adding favorite kink: ' + error.message);
  }

  return { success: true };
};

// Function to remove a favorite kink for the authenticated user
const removeFavoriteKink = async (kinkId: string): Promise<MutationResponse> => {
  const user = await getUser();

  const { error } = await supabase
    .from('user_kink_data')
    .update({ is_favorite: false })
    .eq('user_id', user.id)
    .eq('kink_id', kinkId);

  if (error) {
    throw new Error('Error removing favorite kink: ' + error.message);
  }

  return { success: true };
};

export const useAddFavoriteKink = () => {
  return useOptimisticUpdate(
    upsertFavoriteKink,
    (old, kinkId) => {
      const exists = old.some(kink => kink.kink_id === kinkId);
      // insert or update the kink in the user's favorite kinks
      if (exists) {
        return old.map(kink => kink.kink_id === kinkId ? { ...kink, is_favorite: true } : kink);
      } else {
        return [...old, { kink_id: kinkId, is_favorite: true }];
      }
    }
  );
};

export const useRemoveFavoriteKink = () => {
  return useOptimisticUpdate(
    removeFavoriteKink,
    (old, kinkId) => old.map(kink => kink.kink_id === kinkId ? { ...kink, is_favorite: false } : kink)
  );
};
