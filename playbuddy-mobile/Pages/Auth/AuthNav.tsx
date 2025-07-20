import React, { useMemo } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './WelcomeScreen';
import { ProfileDetailsForm } from './AuthProfileDetailsFormScreen';
import LoginFormScreen from './LoginFormScreen';
import AuthProfileScreen from './AuthProfileScreen';
import { headerOptions } from '../../Common/Header/Header';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../Common/Nav/NavStackType';

const AuthStack = createStackNavigator();

const AuthNav = () => {
    const navigation = useNavigation<NavStack>();
    return (
        <AuthStack.Navigator>
            <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={
                {
                    headerShown: false,
                }
            } />
            <AuthStack.Screen name="Login Form" component={LoginFormScreen} options={
                headerOptions({ navigation, title: 'Login' })
            } />
            <AuthStack.Screen name="Profile Details" component={ProfileDetailsForm} />
            <AuthStack.Screen name="Profile" component={AuthProfileScreen} options={
                headerOptions({ navigation, title: 'Profile' })
            } />
        </AuthStack.Navigator>
    );
};

export default AuthNav;