// useUserFavorites.ts
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

type FavoriteKink = string

export const useUserFavorites = () => {
  const [favoriteKinks, setFavoriteKinks] = useState<FavoriteKink[]>([])

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      return data.user
    }

    const fetchFavoriteKinks = async (userId: string) => {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          kink_id,
          kinks (
            id,
            idea_title,
            idea_description
          )
        `)
        .eq('profile_id', userId)

        const kinkIds = data?.map((favorite: any) => favorite.kink_id)  

      if (error) {
        console.error('Error fetching favorite kinks:', error.message)
      } else {
        setFavoriteKinks(kinkIds || [])
      }

    }

    const loadUserData = async () => {
      const user = await fetchUser()
      if (user) {
        fetchFavoriteKinks(user.id)
      }
    }

    loadUserData()
  }, [])

  return favoriteKinks;
}
