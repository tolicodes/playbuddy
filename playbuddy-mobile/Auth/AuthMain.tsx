import React from 'react';
import AccountDetails from "./AccountDetails"
import AuthForm from "./AuthForm"
import { useUserContext } from "./UserContext"

const AuthMain = () => {
    const { userId } = useUserContext();

    return userId
        // just says they're logged in
        ? <AccountDetails key={userId} />
        // Login
        : <AuthForm />
}

export default AuthMain;