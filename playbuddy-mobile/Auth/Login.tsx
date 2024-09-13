import React from 'react';
import Account from "./Account"
import Auth from "./Auth"
import { useUserContext } from "./UserContext"

const Login = () => {
    const { userId } = useUserContext();

    return userId
        // just says they're logged in
        ? <Account key={userId} />
        // Login
        : <Auth />
}

export default Login;