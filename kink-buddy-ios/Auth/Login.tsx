import { useState, useEffect } from "react"
import { supabase } from "../supabaseCiient"
import Account from "./Account"
import Auth from "./Auth"
import { useUserContext } from "./UserContext"

export default () => {
    const { userId } = useUserContext();

    return userId
        // just says they're logged in
        ? <Account key={userId} />
        // Login
        : <Auth />

}