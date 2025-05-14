import React, { useEffect, useState } from 'react';
import LoginForm from "./LoginFormScreen";
import { useUserContext } from '../hooks/UserContext';
import { NavStack } from '../../../Common/Nav/NavStackType';
import { useNavigation } from '@react-navigation/native';
import { PreferencesScreen } from './PreferencesScreen';
import ErrorScreen from './ErrorScreen';
import WelcomeScreen from './WelcomeScreen';
import { ProfileDetailsForm } from './AuthProfileDetailsFormScreen';

type AuthStep = 'welcome' | 'auth' | 'details' | 'preferences' | 'error';

const AuthMainScreen = () => {
    const { authUserId, isProfileComplete, isDefaultsComplete, updateSkippingWelcomeScreen, isLoading, isError } = useUserContext();
    const navigation = useNavigation<NavStack>();
    const [step, setStep] = useState<AuthStep>('welcome');

    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (isError) {
            setStep('error');
            return;
        }

        if (isDefaultsComplete) {
            navigation.navigate('Calendar');
            return;
        }

        if (!authUserId) {
            setStep('welcome');
            return;
        }

        if (!isProfileComplete) {
            setStep('details');
            return;
        }

        setStep('preferences');
    }, [authUserId, isProfileComplete, isDefaultsComplete, navigation]);

    const onClickSkip = () => {
        updateSkippingWelcomeScreen(true);
    };


    const renderStep = () => {
        switch (step) {
            case 'welcome':
                return <WelcomeScreen onClickRegister={() => navigation.navigate('Login Form')} onClickSkip={onClickSkip} />;
            case 'auth':
                return <LoginForm />;
            case 'details':
                return <ProfileDetailsForm />;
            case 'preferences':
                return <PreferencesScreen />;
            case 'error':
                return <ErrorScreen />;
            default:
                throw new Error(`Unknown step: ${step}`);
        }
    };

    return renderStep();
};

export default AuthMainScreen;