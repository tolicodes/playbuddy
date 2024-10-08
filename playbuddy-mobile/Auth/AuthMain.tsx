import React from 'react';
import AccountDetails from "./AccountDetails"
import AuthForm from "./AuthForm"
import { useUserContext } from "./UserContext"

const AuthMain = () => {
    const { authUserId } = useUserContext();

    return authUserId
        // just says they're logged in
        ? <AccountDetails key={authUserId} />
        // Login
        : <AuthForm />
}

export default AuthMain;