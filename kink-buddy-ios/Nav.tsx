import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigationContainer } from '@react-navigation/native';

import EventsList from './Calendar/EventsList/EventsList';
import { EventDetail } from './Calendar/EventDetail';
import { Filters } from './Calendar/Filters';
import Login from './Auth/Login';
import Wishlist from './Pages/Wishlist';
import Moar from './Pages/Moar';
import { NavStackParamList } from './Calendar/types';
import Communities from './Pages/Communities';

type RootTabParamList = {
    Calendar: undefined;
    Kinks: undefined;
    Moar: undefined;
    Wishlist: undefined;
    Communities: undefined
};

const Stack = createStackNavigator<NavStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// Tab Navigator with Calendar, Wishlist, and other screens
const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Calendar') {
                        return <FAIcon name="calendar" size={size} color={color} />;
                    } else if (route.name === 'Kinks') {
                        return <MaterialIcon name="handcuffs" size={size} color={color} />;
                    } else if (route.name === 'Moar') {
                        return <IonIcon name="ellipsis-horizontal" size={size} color={color} />;
                    } else if (route.name === 'Wishlist') {
                        return <FAIcon name="heart" size={size} color={color} />;
                    } else if (route.name === 'Communities') {
                        return <FAIcon name="users" size={size} color={color} />;
                    }
                },
                // headerShown: false,
            })}
        >
            <Tab.Screen name="Calendar" component={EventsList}
                options={({ navigation }) => ({
                    title: 'Events', // Customize your screen title here
                    headerRight: () => (
                        <TouchableOpacity
                            style={{ marginRight: 15 }}
                            onPress={() => navigation.navigate('Login')} // replace 'Login' with your actual login screen name
                        >
                            <View style={{
                                width: 30,
                                height: 30,
                                borderRadius: 20,
                                backgroundColor: 'white',
                                borderColor: '#007AFF',
                                borderWidth: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <FAIcon name="user" size={20} color="#007AFF" />
                            </View>
                        </TouchableOpacity>
                    ),
                })}
            />
            <Tab.Screen name="Wishlist" component={Wishlist} />
            {/* <Tab.Screen name="Communities" component={Communities} /> */}
            <Tab.Screen name="Moar" component={Moar} />
        </Tab.Navigator>
    );
};

// Root Stack Navigator that includes the TabNavigator and Stack Screens
export default () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                {/* Tabs as the main screen */}
                <Stack.Screen
                    name="Home"
                    component={TabNavigator}
                    options={{ headerShown: false }}
                />

                {/* Stack screens */}


                <Stack.Screen
                    name="Event Details"
                    component={EventDetail}
                    options={({ navigation, route }) => ({
                        headerShown: true,
                        headerTitle: 'Event Details',
                        // Dynamic back button that navigates based on the previous tab
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => {
                                const origin = route.params?.origin || 'Calendar';
                                navigation.navigate(origin); // Navigate back to the origin tab
                            }}>
                                <FAIcon name="arrow-left" size={24} color="#007AFF" style={{ marginLeft: 10 }} />
                            </TouchableOpacity>
                        ),
                    })}
                />
                <Stack.Screen
                    name="Filters"
                    component={Filters}
                    options={{ headerShown: true, headerTitle: 'Filters' }}
                />
                <Stack.Screen
                    name="Login"
                    component={Login}
                    options={{ headerShown: true, headerTitle: 'Login' }}
                />
                <Stack.Screen
                    name="Wishlist"
                    component={Wishlist}
                    options={{ headerShown: true, headerTitle: 'Wishlist' }}
                />
                {/* <Stack.Screen name="CommunityEvents" component={CommunityEvents}
                    options={{ headerShown: true, headerTitle: 'Wishlist' }}
                /> */}

            </Stack.Navigator>
        </NavigationContainer>
    );
};
