import { Kink } from '../../Common/types';
import { supabase } from '../../Common/supabaseClient';

export const addKinkData = async (data: Partial<Kink>) => {
  const { data: insertedData, error } = await supabase
    .from('kinks')
    .insert(data);

  if (error) {
    throw new Error('Error inserting kink data: ' + error.message);
  }

  console.log('Inserted data:', insertedData);
  return insertedData;
};
