import { useState, useEffect } from "react"
import { supabase } from "../supabaseCiient"
import Account from "./Account"
import Auth from "./Auth"

export default () => {
    const [session, setSession] = useState<Session | null>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
    }, [])

    return session && session.user ? <Account key={session.user.id} session={session} /> : <Auth />

}