import { View } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { TouchableOpacity } from "react-native";
import { useCalendarContext } from "../../Pages/Calendar/hooks/CalendarContext";
import { Badge } from "./Badge";
import EventCalendarView from "../../Pages/Calendar/EventCalendarView/EventCalendarView";
import MyCalendar from "../../Pages/MyCalendar";
import { OrganizersNav } from "../../Pages/Organizers/OrganizersNav";
import { DiscoverEvents } from "../../Pages/DiscoverEvents/DiscoverEvents";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useNavigation } from "@react-navigation/native";
import { headerOptions } from "../Header/Header";
const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const { availableCardsToSwipe } = useCalendarContext();
    const { authUserId } = useUserContext();
    const navigation = useNavigation();

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
            }}
        >
            <Tab.Screen
                name="Calendar"
                component={EventCalendarView}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FAIcon name="calendar" size={size} color={color} />
                    ),
                    ...headerOptions({ navigation, title: 'Calendar', isRootScreen: true }),
                }}
            />
            <Tab.Screen
                name="My Calendar"
                component={MyCalendar}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FAIcon name="heart" size={size} color={color} />
                    ),
                    ...headerOptions({ navigation, title: 'My Calendar', isRootScreen: true }),
                }}
            />
            <Tab.Screen
                name="Organizers"
                component={OrganizersNav}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <FAIcon name="users-cog" size={size} color={color} />
                    ),
                    ...headerOptions({ navigation, title: 'Organizers', isRootScreen: true }),
                }}
            />
            <Tab.Screen
                name="Discover Events"
                component={DiscoverEvents}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <FAIcon name="layer-group" size={size} color={color} />
                            {availableCardsToSwipe.length > 0 && authUserId && <Badge count={availableCardsToSwipe.length} />}
                        </View>
                    ),
                    ...headerOptions({ navigation, title: 'Discover Events', isRootScreen: true }),
                }}
            />
        </Tab.Navigator>
    );
};