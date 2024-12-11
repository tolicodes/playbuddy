import { View } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { TouchableOpacity } from "react-native";
import { useCalendarContext } from "../../Pages/Calendar/hooks/CalendarContext";
import { Badge } from "./Badge";
import EventCalendarView from "../../Pages/Calendar/EventCalendarView";
import MyCalendar from "../../Pages/MyCalendar";
import { SwipeMode } from "../../Pages/SwipeMode";

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const { availableCardsToSwipe } = useCalendarContext();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarButton: (props: BottomTabBarButtonProps) => (
                    <TouchableOpacity
                        {...props}
                        onPress={(e) => {
                            amplitude.logEvent('Tab Clicked', { tabName: props.accessibilityLabel });
                            props.onPress?.(e);
                        }}
                    />
                ),
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Main Calendar"
                component={EventCalendarView}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FAIcon name="calendar" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="My Calendar"
                component={MyCalendar}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FAIcon name="heart" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Swipe Mode"
                component={SwipeMode}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <FAIcon name="layer-group" size={size} color={color} />
                            {availableCardsToSwipe.length > 0 && <Badge count={availableCardsToSwipe.length} />}
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};