import React from 'react';
import AccountDetails from "./AccountDetails"
import AuthForm from "./AuthForm"
import { useUserContext } from '../hooks/UserContext';

const AuthScreen = () => {
    const { authUserId } = useUserContext();

    return authUserId
        ? <AccountDetails key={authUserId} />
        : <AuthForm />
}

export default AuthScreen;