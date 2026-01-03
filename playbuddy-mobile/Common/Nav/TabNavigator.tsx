import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
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
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { ADMIN_EMAILS } from "../../config";
import { ActionSheet } from "../../components/ActionSheet";
import { useCalendarContext } from "../../Pages/Calendar/hooks/CalendarContext";
import EventsLoadingScreen from "../../components/EventsLoadingScreen";
import { colors, fontSizes, radius, spacing } from "../../components/styles";
const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const navigation = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();
    const { userProfile, authUserId } = useUserContext();
    const { isLoadingEvents } = useCalendarContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const { data: events } = useFetchEvents({ includeApprovalPending: isAdmin });
    const { height: windowHeight } = useWindowDimensions();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const WrappedEventCalendarView = () => {
        return <EventCalendarView events={events || []} />
    }

    const moreSheetHeight = Math.min(windowHeight * 0.85, 680);

    if (authUserId && isLoadingEvents) {
        return <EventsLoadingScreen />;
    }

    return (
        <>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    tabBarButton: (props: BottomTabBarButtonProps) => (
                        <TouchableOpacity
                            {...props}
                            onPress={(e) => {
                                const tabName = props.accessibilityLabel?.replace(/,.*/g, '') || route.name;
                                logEvent(UE.TabNavigatorTabClicked, {
                                    ...analyticsProps,
                                    tab_name: tabName,
                                });

                                if (route.name === 'More') {
                                    setIsMoreOpen((prev) => !prev);
                                    return;
                                }

                                props.onPress?.(e);
                            }}
                        />
                    ),
                })}
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
                            <FAIcon name="user-friends" size={size} color={color} />
                        ),
                        tabBarLabel: 'Communities',
                        ...headerOptions({ navigation, title: 'Communities', isRootScreen: true }),
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
            <ActionSheet
                visible={isMoreOpen}
                height={moreSheetHeight}
                onClose={() => setIsMoreOpen(false)}
                dismissOnBackdropPress
            >
                <View style={styles.moreSheet}>
                    <View style={styles.moreHandle} />
                    <View style={styles.moreHeader}>
                        <Text style={styles.moreTitle}>More</Text>
                        <TouchableOpacity
                            onPress={() => setIsMoreOpen(false)}
                            accessibilityLabel="Close more menu"
                        >
                            <FAIcon name="times" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <DiscoverPage variant="modal" onRequestClose={() => setIsMoreOpen(false)} />
                </View>
            </ActionSheet>
        </>
    );
};

const styles = StyleSheet.create({
    moreSheet: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    moreHandle: {
        width: 36,
        height: 4,
        borderRadius: radius.xxs,
        backgroundColor: colors.textDisabled,
        alignSelf: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    moreHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    moreTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
});
