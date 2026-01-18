import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { BottomTabBarButtonProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

import EventCalendarView from "../../Pages/Calendar/ListView/EventCalendarView";
import MyCalendar from "../../Pages/EventLists/MyCalendar";
import { OrganizersNav } from "../../Pages/Organizers/OrganizersNav";
import { headerOptions } from "../Header/Header";
import { UE } from "../../userEventTypes";
import { logEvent } from "../hooks/logger";
import { useAnalyticsProps } from "../hooks/useAnalytics";
import { DiscoverPage, DiscoverPageModal } from "../../Pages/DiscoverPage";
import { ActionSheet } from "../../components/ActionSheet";
import { colors, fontSizes, gradients, radius, spacing } from "../../components/styles";
import { NotificationsScreen } from "../../Pages/Notifications/NotificationsScreen";
import DebugScreen from "../../Pages/Debug/DebugScreen";
import EventDetails from "../../Pages/Calendar/EventDetails/EventDetails";
import { CommunityEvents } from "../../Pages/Communities/CommunityEvents";
import { MunchDetails } from "../../Pages/Munches/MunchDetails";
import FacilitatorProfile from "../../Pages/Facilitators/FacilitatorProfile/FacilitatorProfile";
import { ProfileDetailsForm } from "../../Pages/Auth/AuthProfileDetailsFormScreen";
import AuthProfileScreen from "../../Pages/Auth/AuthProfileScreen";
import ConsentScreen from "../../Pages/Auth/ConsentScreen";
import { WeeklyPicks } from "../../Pages/Entries/WeeklyPicks";
import { Facilitators } from "../../Pages/Facilitators/Facilitators";
import { PromosListScreen } from "../../Pages/EventLists/PromosListScreen";
import PopularEvents from "../../Pages/EventLists/PopularEvents";
import { Retreats } from "../../Pages/EventLists/Retreats";
import { MunchesScreen } from '../../Pages/Munches/MunchesScreen';
import PlayParties from "../../Pages/EventLists/PlayParties";
import Moar from "../../Pages/Moar";
import SubmitEvent from "../../Pages/SubmitEvent";
import { AdminScreen } from "../../Pages/Admin/AdminScreen";
import ImportEventURLsScreen from "../../Pages/Admin/ImportEventURLsScreen";
import WeeklyPicksAdminScreen from "../../Pages/Admin/WeeklyPicksAdminScreen";
import OrganizerAdminScreen from "../../Pages/Admin/OrganizerAdminScreen";
import EventAdminScreen from "../../Pages/Admin/EventAdminScreen";
import PromoCodeAdminScreen from "../../Pages/Admin/PromoCodeAdminScreen";
import EventPopupAdminScreen from "../../Pages/Admin/EventPopupAdminScreen";
import PushNotificationsAdminScreen from "../../Pages/Admin/PushNotificationsAdminScreen";
import { DiscoverGame } from "../../Pages/DiscoverGame/DiscoverGame";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const renderSharedStackScreens = () => (
    <>
        <Stack.Screen
            name="Profile Details"
            component={ProfileDetailsForm}
            options={({ navigation }) => headerOptions({ navigation, title: 'Profile Details' })}
        />
        <Stack.Screen
            name="Profile"
            component={AuthProfileScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Profile' })}
        />
        <Stack.Screen
            name="Consent"
            component={ConsentScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Consent' })}
        />
        <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Notifications' })}
        />
        <Stack.Screen
            name="Debug"
            component={DebugScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Debug' })}
        />
        <Stack.Screen
            name="Event Details"
            component={EventDetails}
            options={({ navigation }) => ({
                ...headerOptions({
                    navigation,
                    title: 'Event Details',
                    backgroundColor: gradients.nav[0],
                }),
                cardStyle: { backgroundColor: colors.lavenderBackground },
            })}
        />
        <Stack.Screen
            name="Community Events"
            component={CommunityEvents}
            options={({ navigation }) => headerOptions({ navigation, title: 'Events' })}
        />
        <Stack.Screen
            name="Munch Details"
            component={MunchDetails}
            options={({ navigation }) => headerOptions({ navigation, title: 'Munch Details' })}
        />
        <Stack.Screen
            name="Facilitator Profile"
            component={FacilitatorProfile}
            options={({ navigation }) => headerOptions({ navigation, title: 'Facilitator Profile' })}
        />
        <Stack.Screen
            name="Weekly Picks"
            component={WeeklyPicks}
            options={({ navigation }) => headerOptions({ navigation, title: "PB's Weekly Picks" })}
        />
        <Stack.Screen
            name="Facilitators"
            component={Facilitators}
            options={({ navigation }) => headerOptions({ navigation, title: 'Facilitators' })}
        />
        <Stack.Screen
            name="Promos"
            component={PromosListScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Promos' })}
        />
        <Stack.Screen
            name="Popular Events"
            component={PopularEvents}
            options={({ navigation }) => headerOptions({ navigation, title: 'Popular Events' })}
        />
        <Stack.Screen
            name="Retreats"
            component={Retreats}
            options={({ navigation }) => headerOptions({ navigation, title: 'Festivals/Conferences/Retreats' })}
        />
        <Stack.Screen
            name="Munches"
            component={MunchesScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Munches' })}
        />
        <Stack.Screen
            name="Play Parties"
            component={PlayParties}
            options={({ navigation }) => headerOptions({ navigation, title: 'Play Parties' })}
        />
        <Stack.Screen
            name="Moar"
            component={Moar}
            options={({ navigation }) => headerOptions({ navigation, title: 'Moar' })}
        />
        <Stack.Screen
            name="Submit Event"
            component={SubmitEvent}
            options={({ navigation }) => headerOptions({ navigation, title: 'Add Your Event' })}
        />
        <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Admin' })}
        />
        <Stack.Screen
            name="Import URLs"
            component={ImportEventURLsScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Import URLs' })}
        />
        <Stack.Screen
            name="Weekly Picks Admin"
            component={WeeklyPicksAdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Weekly Picks Admin' })}
        />
        <Stack.Screen
            name="Organizer Admin"
            component={OrganizerAdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Organizer Admin' })}
        />
        <Stack.Screen
            name="Event Admin"
            component={EventAdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Event Admin' })}
        />
        <Stack.Screen
            name="Promo Codes Admin"
            component={PromoCodeAdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Promo Codes Admin' })}
        />
        <Stack.Screen
            name="Event Popups Admin"
            component={EventPopupAdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Message Popups' })}
        />
        <Stack.Screen
            name="Push Notifications Admin"
            component={PushNotificationsAdminScreen}
            options={({ navigation }) => headerOptions({ navigation, title: 'Push Notifications Admin' })}
        />
        <Stack.Screen
            name="Discover Game"
            component={DiscoverGame}
            options={({ navigation }) => headerOptions({ navigation, title: 'Discover Game' })}
        />
    </>
);

type TabStackConfig = {
    rootName: string;
    RootComponent: React.ComponentType;
    rootOptions: (args: { navigation: any }) => any;
};

const createTabStack = ({
    rootName,
    RootComponent,
    rootOptions,
}: TabStackConfig) => {
    const TabStack = () => (
        <Stack.Navigator>
            <Stack.Screen
                name={rootName}
                component={RootComponent}
                options={rootOptions}
            />
            {renderSharedStackScreens()}
        </Stack.Navigator>
    );

    TabStack.displayName = `${rootName}Stack`;
    return TabStack;
};

export const TabNavigator = () => {
    const analyticsProps = useAnalyticsProps();
    const { height: windowHeight } = useWindowDimensions();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const CalendarStack = useMemo(
        () => createTabStack({
            rootName: 'Calendar Home',
            RootComponent: EventCalendarView,
            rootOptions: ({ navigation }) => headerOptions({ navigation, title: 'Calendar', isRootScreen: true }),
        }),
        [],
    );

    const MyCalendarStack = useMemo(
        () => createTabStack({
            rootName: 'My Calendar Home',
            RootComponent: MyCalendar,
            rootOptions: ({ navigation }) => headerOptions({ navigation, title: 'My Calendar', isRootScreen: true }),
        }),
        [],
    );

    const OrganizersStack = useMemo(
        () => createTabStack({
            rootName: 'Organizers Home',
            RootComponent: OrganizersNav,
            rootOptions: ({ navigation }) => headerOptions({ navigation, title: 'Communities', isRootScreen: true }),
        }),
        [],
    );

    const MoreStack = useMemo(
        () => createTabStack({
            rootName: 'More Home',
            RootComponent: DiscoverPage,
            rootOptions: ({ navigation }) => headerOptions({ navigation, title: 'More', isRootScreen: true }),
        }),
        [],
    );

    const moreSheetHeight = Math.min(windowHeight * 0.85, 680);

    return (
        <>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
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
                    component={CalendarStack}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <FAIcon name="calendar" size={size} color={color} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="My Calendar"
                    component={MyCalendarStack}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <FAIcon name="heart" size={size} color={color} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="Organizers"
                    component={OrganizersStack}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <FAIcon name="user-friends" size={size} color={color} />
                        ),
                        tabBarLabel: 'Communities',
                    }}
                />
                <Tab.Screen
                    name="More"
                    component={MoreStack}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <View>
                                <FAIcon name="ellipsis-h" size={size} color={color} />
                            </View>
                        ),
                    }}
                />
            </Tab.Navigator>
            <ActionSheet
                visible={isMoreOpen}
                height={moreSheetHeight}
                debugId="more-menu"
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
                    <DiscoverPageModal onRequestClose={() => setIsMoreOpen(false)} />
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
