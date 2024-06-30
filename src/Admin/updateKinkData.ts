import { Kink } from '../KinkLibrary/types';
import { supabase } from '../supabaseClient';

export const updateKinkData = async (id: number, data: Partial<Kink>) => {
  const { error } = await supabase
    .from('kinks')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Error updating data:', error);
  } else {
    console.log('Data updated successfully');
  }
};