import { Kink } from '../../Common/types';
import { supabase } from '../../Common/supabaseClient';

export const updateKink = async (id: number, kinkData: Partial<Kink>) => {
  const { error, data } = await supabase.from('kinks').update(kinkData).eq('id', id);

  if (error) {
    throw new Error('Error updating kink data: ' + error.message);
  }

  return data;
};
