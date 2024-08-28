import { Kink } from '../../Common/types';
import { supabaseClient } from '../../Common/supabaseClient';

export const addKinkData = async (data: Partial<Kink>) => {
  const { data: insertedData, error } = await supabaseClient
    .from('kinks')
    .insert(data);

  if (error) {
    throw new Error('Error inserting kink data: ' + error.message);
  }

  return insertedData;
};
