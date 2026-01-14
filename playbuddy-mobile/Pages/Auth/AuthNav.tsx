import React, { useMemo } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './WelcomeScreen';
import { ProfileDetailsForm } from './AuthProfileDetailsFormScreen';
import LoginFormScreen from './LoginFormScreen';
import AuthProfileScreen from './AuthProfileScreen';
import { headerOptions } from '../../Common/Header/Header';

const AuthStack = createStackNavigator();

const AuthNav = () => {
    return (
        <AuthStack.Navigator initialRouteName="Welcome">
            <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={
                {
                    headerShown: false,
                }
            } />
            <AuthStack.Screen
                name="Login Form"
                component={LoginFormScreen}
                options={({ navigation }) => headerOptions({ navigation, title: 'Login' })}
            />
            <AuthStack.Screen name="Profile Details" component={ProfileDetailsForm} />
            <AuthStack.Screen name="Profile" component={AuthProfileScreen} options={
                ({ navigation }) => headerOptions({ navigation, title: 'Profile' })
            } />
        </AuthStack.Navigator>
    );
};

export default AuthNav;
