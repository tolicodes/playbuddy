import { Kink } from '../KinkLibrary/types';
import { supabase } from '../supabaseClient';

export const addKinkData = async (data: Partial<Kink>) => {
  const { data: insertedData, error } = await supabase
    .from('kinks')
    .insert(data);

  if (error) {
    console.error('Error adding data:', error);
    return null;
  } else {
    console.log('Data added successfully:', insertedData);
    return insertedData;
  }
};
