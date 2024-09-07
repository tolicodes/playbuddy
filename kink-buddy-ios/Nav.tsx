import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';

import EventCalendarView from './Calendar/EventCalendarView';
import { EventDetail } from './Calendar/EventDetail';
import { Filters } from './Calendar/Filters/Filters';
import Login from './Auth/Login';
import Wishlist from './Pages/Wishlist';
import Moar from './Pages/Moar';
import Communities from './Pages/Communities';
import HeaderLoginButton from './Auth/HeaderLoginButton';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Define rightHeaderOptions with the login button
const rightHeaderOptions = () => ({
    headerRight: () => (
        <HeaderLoginButton />
    ),
});

// Create Stack Navigators for each tab with screen headers
const CalendarStack = () => (
    <Stack.Navigator>
        <Stack.Screen
            name="Event Calendar"
            component={EventCalendarView}
            options={{ headerTitle: 'Event Calendar', ...rightHeaderOptions() }}
        />
        <Stack.Screen
            name="Event Details"
            component={EventDetail}
            options={{ headerTitle: 'Event Details', ...rightHeaderOptions() }}
        />
        <Stack.Screen name="Filters" component={Filters} options={{ headerTitle: 'Filters' }} />
    </Stack.Navigator>
);

const WishlistStack = () => (
    <Stack.Navigator>
        <Stack.Screen
            name="Wishlist"
            component={Wishlist}
            options={{ headerTitle: 'Wishlist', ...rightHeaderOptions() }}
        />
    </Stack.Navigator>
);

const CommunitiesStack = () => (
    <Stack.Navigator>
        <Stack.Screen
            name="Communities"
            component={Communities}
            options={{ headerTitle: 'Communities', ...rightHeaderOptions() }}
        />
    </Stack.Navigator>
);

const MoarStack = () => (
    <Stack.Navigator>
        <Stack.Screen
            name="MoarView"
            component={Moar}
            options={{ headerTitle: 'Moar', ...rightHeaderOptions() }}
        />
    </Stack.Navigator>
);

// Create the Tab Navigator with both titles and icons
const TabNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
                if (route.name === 'CalendarTab') return <FAIcon name="calendar" size={size} color={color} />;
                if (route.name === 'WishlistTab') return <FAIcon name="heart" size={size} color={color} />;
                if (route.name === 'CommunitiesTab') return <FAIcon name="users" size={size} color={color} />;
                if (route.name === 'MoarTab') return <IonIcon name="ellipsis-horizontal" size={size} color={color} />;
            },
        })}
    >
        <Tab.Screen
            name="CalendarTab"
            component={CalendarStack}
            options={{ tabBarLabel: 'Calendar', headerShown: false }}
        />
        <Tab.Screen
            name="WishlistTab"
            component={WishlistStack}
            options={{ tabBarLabel: 'Wishlist', headerShown: false }}
        />
        <Tab.Screen
            name="CommunitiesTab"
            component={CommunitiesStack}
            options={{ tabBarLabel: 'Communities', headerShown: false }}
        />
        <Tab.Screen
            name="MoarTab"
            component={MoarStack}
            options={{ tabBarLabel: 'More', headerShown: false }}
        />
    </Tab.Navigator>
);

// Root Stack with Login and Tabs
export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Home"
                    component={TabNavigator}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Login"
                    component={Login}
                    options={{ headerTitle: 'Login' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
