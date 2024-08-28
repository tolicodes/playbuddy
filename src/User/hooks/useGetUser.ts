// hooks/useGetUser.ts
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../Common/supabaseClient';
import { User } from '@supabase/supabase-js';

// Function to fetch the user data
export const getUser = async (): Promise<User> => {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
        throw new Error('Error fetching user: ' + error?.message);
    }

    return data.user;
};

// Custom hook to get the user data
export const useGetUser = () => {
    const { data: user, isLoading } = useQuery({
        queryKey: ['user'],
        queryFn: getUser,
    });

    return { user, isLoading };
};
