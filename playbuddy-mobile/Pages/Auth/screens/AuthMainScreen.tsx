import React, { useEffect, useState } from 'react';
import AuthForm from "./AuthFormScreen"
import { useUserContext } from '../hooks/UserContext';
import Profile from './AuthProfileScreen';
import { ProfileDetailsForm } from './AuthProfileDetailsFormScreen';

type AuthStep = 'auth' | 'details';

const AuthScreen = () => {
    const { authUserId, userProfile, isProfileComplete } = useUserContext();
    const [step, setStep] = useState<AuthStep>('auth');

    // If we already created a user profile, we can skip the details screen
    // If they created an account but not a profile, we ask for user's name and avatar
    // If they haven't created an account, we ask them to sign in with Google, email, or phone
    useEffect(() => {
        if (authUserId) {
            setStep('details');
        } else {
            setStep('auth');
        }
    }, [authUserId, userProfile, isProfileComplete]);

    const renderStep = () => {
        switch (step) {
            case 'auth': return <AuthForm />;
            case 'details': return <ProfileDetailsForm />;
        }
    }

    return renderStep();
}

export default AuthScreen;