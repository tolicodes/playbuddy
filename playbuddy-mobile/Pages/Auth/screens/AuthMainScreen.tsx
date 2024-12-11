import React, { useEffect, useState } from 'react';
import AuthForm from "./AuthFormScreen"
import { useUserContext } from '../hooks/UserContext';
import { ProfileDetailsForm } from './AuthProfileDetailsFormScreen';
import { WelcomeScreen } from './WelcomeScreen';
import { NavStack } from '../../../Common/Nav/NavStackType';
import { useNavigation } from '@react-navigation/native';
import { PreferencesScreen } from './PreferencesScreen';

type AuthStep = 'welcome' | 'auth' | 'details' | 'preferences';

const AuthMainScreen = () => {
    const { authUserId, userProfile, isProfileComplete, isDefaultsComplete, updateSkippingWelcomeScreen } = useUserContext();
    const { navigate } = useNavigation<NavStack>();
    const [step, setStep] = useState<AuthStep>('welcome');

    // If we already created a user profile, we can skip the details screen
    // If they created an account but not a profile, we ask for user's name and avatar
    // If they haven't created an account, we ask them to sign in with Google, email, or phone
    // If the continue from the welcome screen, we will show the auth screen
    useEffect(() => {
        if (isDefaultsComplete) {
            navigate('Main Calendar');
        }

        // user is not logged in
        if (!authUserId) {
            setStep('welcome');
        }

        // "auth" step is set by the welcome screen

        // if the user created an account but not a profile, we ask for their name and avatar
        if (authUserId && !isProfileComplete) {
            setStep('details');
        }

        // if the user has a profile, we ask for their preferences
        if (authUserId && isProfileComplete) {
            setStep('preferences');
        }

    }, [authUserId, userProfile, isProfileComplete]);


    const onClickSkip = () => {
        updateSkippingWelcomeScreen(true);
    }

    const renderStep = () => {
        switch (step) {
            case 'welcome': return <WelcomeScreen onClickRegister={() => {
                setStep('auth');
            }} onClickSkip={onClickSkip} />;
            case 'auth': return <AuthForm />;
            case 'details': return <ProfileDetailsForm />;
            case 'preferences': return <PreferencesScreen />;
            default: {
                throw new Error(`Unknown step: ${step}`);
            }
        }
    }

    return renderStep();
}

export default AuthMainScreen;