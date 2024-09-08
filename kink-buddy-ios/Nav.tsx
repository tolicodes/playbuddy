import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import EventCalendarView from './Calendar/EventCalendarView';
import { EventDetail } from './Calendar/EventDetail';
import { Filters } from './Calendar/Filters/Filters';
import Login from './Auth/Login';
import Wishlist from './Pages/Wishlist';
import Moar from './Pages/Moar';
import Communities from './Pages/Communities';
import HeaderLoginButton from './Auth/HeaderLoginButton';
import DeepLinkHandler from './DeepLinkHandler';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Define rightHeaderOptions with the login button
const rightHeaderOptions = () => ({
    headerRight: () => <HeaderLoginButton />,
});

// Create the Tab Navigator with both titles and icons
const TabNavigator = () => {

    return (
        <>
            <DeepLinkHandler />
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    tabBarIcon: ({ color, size }) => {
                        if (route.name === 'Calendar') return <FAIcon name="calendar" size={size} color={color} />;
                        if (route.name === 'Wishlist') return <FAIcon name="heart" size={size} color={color} />;
                        if (route.name === 'Communities') return <FAIcon name="users" size={size} color={color} />;
                        if (route.name === 'Moar') return <IonIcon name="ellipsis-horizontal" size={size} color={color} />;
                    },
                })}
            >
                <Tab.Screen name="Calendar" component={EventCalendarView} options={rightHeaderOptions} />
                <Tab.Screen name="Wishlist" component={Wishlist} options={rightHeaderOptions} />
                <Tab.Screen name="Communities" component={Communities} options={rightHeaderOptions} />
                <Tab.Screen name="Moar" component={Moar} options={rightHeaderOptions} />
            </Tab.Navigator>
        </>
    )
};

// Root Stack with all screens, including the TabNavigator
export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                {/* Main Tabs */}
                <Stack.Screen
                    name="Home"
                    component={TabNavigator}
                    options={{ headerShown: false }}
                />
                {/* Login Screen */}
                <Stack.Screen
                    name="Login"
                    component={Login}
                    options={{ headerTitle: 'Login' }}
                />
                {/* Other Screens */}
                <Stack.Screen
                    name="Event Details"
                    component={EventDetail}
                    options={{ headerTitle: 'Event Details' }}
                />
                <Stack.Screen
                    name="Filters"
                    component={Filters}
                    options={{ headerTitle: 'Filters' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );

}
