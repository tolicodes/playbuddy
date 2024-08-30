import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EventsList from './EventsList';
import { EventDetail } from './EventDetail';
import { Filters } from './Filters';
import CalendarProvider from './CalendarContext';

const CalendarStack = createStackNavigator();

export default () => {

    return (
        <CalendarProvider>
            <CalendarStack.Navigator>
                <CalendarStack.Screen
                    name="Event List"
                    component={EventsList}
                    options={{ headerShown: false }}
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
            </CalendarStack.Navigator>
        </CalendarProvider>

    );
};
