import React, { useMemo } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './WelcomeScreen';
import LoginFormScreen from './LoginFormScreen';
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
        </AuthStack.Navigator>
    );
};

export default AuthNav;
