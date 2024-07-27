import { supabase } from '../supabaseClient';
import { Kink } from '../types';
import { useQuery } from '@tanstack/react-query';

const getKinks = async (): Promise<Kink[]> => {
  const { data: kinks, error } = await supabase
    .from('kinks')
    .select('*')
    .order('id', { ascending: true });


  if (error) {
    throw new Error('Error fetching kinks: ' + error.message);
  }

  return kinks;
};

type UseGetKinkReturn = {
  kinks?: Kink[];
  isLoading: boolean;
};

export const useGetKinks = (): UseGetKinkReturn => {
  const { data: kinks = [], isLoading } = useQuery({
    queryKey: ['kinks'],
    queryFn: getKinks,
  });

  if (isLoading) {
    return { isLoading };
  }

  return { kinks, isLoading };
};
