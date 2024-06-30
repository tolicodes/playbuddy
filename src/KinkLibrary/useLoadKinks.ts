// useLoadKinks.ts
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Kinks } from './types'

export const useLoadKinks = (): Kinks => {
  const [allKinks, setAllKinks] = useState<Kinks>([])

  useEffect(() => {
    const fetchKinks = async () => {
      const { data: kinks, error } = await supabase
        .from('kinks')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching kinks:', error)
      } else {
        setAllKinks(kinks || [])
      }
    }

    fetchKinks()
  }, [])

  return allKinks
}
