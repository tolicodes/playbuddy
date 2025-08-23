import { View } from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { TouchableOpacity } from "react-native";
import EventCalendarView from "../../Pages/Calendar/ListView/EventCalendarView";
import MyCalendar from "../../Pages/EventLists/MyCalendar";
import { OrganizersNav } from "../../Pages/Organizers/OrganizersNav";
import { useNavigation } from "@react-navigation/native";
import { headerOptions } from "../Header/Header";
import { NavStack } from "./NavStackType";
import { useFetchEvents } from "../db-axios/useEvents";
import { UE } from "../../userEventTypes";
import { logEvent } from "../hooks/logger";
import { useAnalyticsProps } from "../hooks/useAnalytics";
import { DiscoverPage } from "../../Pages/DiscoverPage";
const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const navigation = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();
    const { data: events } = useFetchEvents();

    const WrappedEventCalendarView = () => {
        return <EventCalendarView events={events || []} />
    }

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarButton: (props: BottomTabBarButtonProps) => (
                    <TouchableOpacity
                        {...props}
                        onPress={(e) => {
                            logEvent(UE.TabNavigatorTabClicked, {
                                ...analyticsProps,
                                // "Organizers, tab, 3 of 4" -> "Organizers"
                                tab_name: props.accessibilityLabel?.replace(/,.*/g, '') || ''
                            });
                            props.onPress?.(e);
                        }}
                    />
                ),
            }}
        >
            <Tab.Screen
                name="Calendar"
                component={WrappedEventCalendarView}
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
                name="More"
                component={DiscoverPage}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <FAIcon name="ellipsis-h" size={size} color={color} />
                            {/* {availableCardsToSwipe.length > 0 && authUserId && <Badge count={availableCardsToSwipe.length} />} */}
                        </View>
                    ),
                    ...headerOptions({ navigation, title: 'More', isRootScreen: true }),
                }}
            />
        </Tab.Navigator>
    );
};