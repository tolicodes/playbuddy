import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../Common/supabaseClient';
import { useGetUser } from '../hooks/useGetUser';

export const getFavoriteKinks = async (userId: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`kink_id`)
    .eq('profile_id', userId);

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
    queryKey: ['favoriteKinks', userId],
    queryFn: () => getFavoriteKinks(userId as string),
    enabled: !!userId
  });

  if (isLoadingUser || isLoadingFavoriteKinks) {
    return { isLoading: true };
  }

  return { favoriteKinkIds, isLoading: false };
};
