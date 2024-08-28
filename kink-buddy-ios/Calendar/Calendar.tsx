import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EventsList from './EventsList';
import { EventDetail } from './EventDetail';

const CalendarStack = createStackNavigator();

const CalendarWrapper = () => {
    return (
        <CalendarStack.Navigator>
            <CalendarStack.Screen name="Event List" component={EventsList} options={{ headerShown: false }} />
            <CalendarStack.Screen name="Event Details" component={EventDetail} options={{ headerShown: true, headerTitle: 'Event Details' }} />
        </CalendarStack.Navigator>
    );
};

export default CalendarWrapper;
