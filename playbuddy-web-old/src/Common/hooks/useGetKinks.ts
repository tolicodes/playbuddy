import { Kink } from '../types';
import { useQuery } from '@tanstack/react-query';

const getKinks = async (): Promise<Kink[]> => {
  const response = await fetch('https://api.playbuddy.me/kinks');
  return response.json();
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
