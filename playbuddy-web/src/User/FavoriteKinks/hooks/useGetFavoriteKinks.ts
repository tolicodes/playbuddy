import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../Common/supabaseClient';
import { useGetUser } from '../../hooks/useGetUser';

export const getFavoriteKinks = async (userId: string) => {
  const { data, error } = await supabaseClient
    .from('user_kink_data')
    .select('kink_id')
    .eq('user_id', userId)
    .eq('is_favorite', true);

  if (error) {
    throw new Error('Error fetching favorite kinks: ' + error.message);
  }

  return data?.map((favorite: any) => favorite.kink_id) || [];
};

type FavoriteKinkId = string;

interface UseGetFavoriteKinksResult {
  favoriteKinkIds?: FavoriteKinkId[];
  isLoading?: boolean;
}

export const useGetFavoriteKinks = (): UseGetFavoriteKinksResult => {
  const { user, isLoading: isLoadingUser } = useGetUser();

  const userId = user?.id;
  const { data: favoriteKinkIds = [], isLoading: isLoadingFavoriteKinks } = useQuery({
    queryKey: ['userKinkMetadata', userId],
    queryFn: () => getFavoriteKinks(userId as string),
    enabled: !!userId,
  });

  if (isLoadingUser || isLoadingFavoriteKinks) {
    return { isLoading: true };
  }

  return { favoriteKinkIds, isLoading: false };
};
