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
import { OrganizersNav } from "../../Pages/Organizers/OrganizersNav";
import { SwipeMode } from "../../Pages/SwipeMode";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const { availableCardsToSwipe } = useCalendarContext();
    const { authUserId } = useUserContext();

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
                name="Calendar"
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
                name="Organizers"
                component={OrganizersNav}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FAIcon name="users-cog" size={size} color={color} />
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
                            {availableCardsToSwipe.length > 0 && authUserId && <Badge count={availableCardsToSwipe.length} />}
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};