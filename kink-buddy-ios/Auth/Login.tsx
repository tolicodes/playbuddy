import { useState, useEffect } from "react"
import { supabase } from "../supabaseCiient"
import Account from "./Account"
import Auth from "./Auth"
import { useNavigation } from "@react-navigation/native"

export default () => {
    const [session, setSession] = useState<any | null>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
    }, [])


    return session && session.user
        // just says they're logged in
        ? <Account key={session.user.id} session={session} />
        // Login
        : <Auth />

}