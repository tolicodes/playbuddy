import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';

import EventsList from './EventsList/EventsList';
import { EventDetail } from './EventDetail';
import { Filters } from './Filters';
import Login from '../Auth/Login';
import Wishlist from './Wishlist';

const CalendarStack = createStackNavigator();

export default () => {

    return (
        <CalendarStack.Navigator>
            <CalendarStack.Screen
                name="Event List"
                component={EventsList}

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
            <CalendarStack.Screen
                name="Event Details"
                component={EventDetail}
                options={{ headerShown: true, headerTitle: 'Event Details' }}
            />
            <CalendarStack.Screen
                name="Filters"
                component={Filters}
                options={{ headerShown: true, headerTitle: 'Filters' }}
            />
            <CalendarStack.Screen
                name="Login"
                component={Login}
                options={{ headerShown: true, headerTitle: 'Login' }}
            />
            <CalendarStack.Screen
                name="Wishlist"
                component={Wishlist}
                options={{ headerShown: true, headerTitle: 'Wishlist' }}
            />
        </CalendarStack.Navigator>

    );
};
