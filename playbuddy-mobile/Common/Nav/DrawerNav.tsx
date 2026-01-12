import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HomeStackNavigator } from "./HomeNavigator";
import { Retreats } from "../../Pages/EventLists/Retreats";
import { headerOptions } from "../Header/Header";
import { View } from "react-native";
import Moar from "../../Pages/Moar";
import { WeeklyPicks } from "../../Pages/Entries/WeeklyPicks";
import { PromosListScreen } from "../../Pages/EventLists/PromosListScreen";
import PlayParties from "../../Pages/EventLists/PlayParties";
import { MunchesScreen } from '../../Pages/Munches/MunchesScreen'
import { DiscoverGame } from "../../Pages/DiscoverGame/DiscoverGame";
import { Facilitators } from "../../Pages/Facilitators/Facilitators";
import PopularEvents from "../../Pages/EventLists/PopularEvents";
import { AdminScreen } from "../../Pages/Admin/AdminScreen";
import ImportEventURLsScreen from "../../Pages/Admin/ImportEventURLsScreen";
import WeeklyPicksAdminScreen from "../../Pages/Admin/WeeklyPicksAdminScreen";
import OrganizerAdminScreen from "../../Pages/Admin/OrganizerAdminScreen";
import EventAdminScreen from "../../Pages/Admin/EventAdminScreen";
import PromoCodeAdminScreen from "../../Pages/Admin/PromoCodeAdminScreen";
import EventPopupAdminScreen from "../../Pages/Admin/EventPopupAdminScreen";
import PushNotificationsAdminScreen from "../../Pages/Admin/PushNotificationsAdminScreen";
import { logEvent } from "../hooks/logger";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../hooks/useAnalytics";
import { colors } from "../../components/styles";
import { navigateToHome, navigateToTab } from "./navigationHelpers";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { ADMIN_EMAILS } from "../../config";

const Drawer = createDrawerNavigator();

export const DrawerNav = () => {
    const analyticsProps = useAnalyticsProps();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const getIcon = (name: string) => {
        const getter = ({ color, size }: { color: string, size: number }) => {
            return (<View style={{ flexDirection: 'column', alignItems: 'center', width: size + 5, height: size + 5 }}>
                <FAIcon name={name} size={size} color={color} />
            </View>)
        }
        return getter;
    }

    const onPressItemLogEventListener = (screenName: string) => {
        return () => ({
            drawerItemPress: () => {
                logEvent(UE.DrawerItemPressed, {
                    ...analyticsProps,
                    screen_name: screenName,
                });
            },
        })
    }

    return (
        <Drawer.Navigator>
            <Drawer.Screen
                name="HomeDrawer"
                component={HomeStackNavigator}
                options={{
                    drawerIcon: getIcon('home'),
                    title: 'Home',
                    headerShown: false,
                }}
                listeners={({ navigation }) => ({
                    drawerItemPress: (e) => {
                        e.preventDefault();

                        // This is inside the HomeStackNavigator
                        navigateToHome(navigation);
                    },
                })}
            />

            <Drawer.Screen
                name="Facilitators"
                component={Facilitators}
                options={({ navigation }) => ({
                    ...headerOptions({ navigation, title: 'Facilitators' }),
                    drawerIcon: getIcon('user-tie'),
                })}
                listeners={onPressItemLogEventListener('Facilitators')}
            />

            <Drawer.Screen
                name="Promos"
                component={PromosListScreen}
                options={({ navigation }) => ({
                    ...headerOptions({ navigation, title: 'Promos' }),
                    drawerIcon: ({ size }) => (
                        <View style={{ flexDirection: 'column', alignItems: 'center', width: size + 5, height: size + 5 }}>
                            <FAIcon name="ticket-alt" size={size} color={colors.gold} />
                        </View>
                    ),
                })}
                listeners={onPressItemLogEventListener('Promos')}
            />


            <Drawer.Screen
                name="Weekly Picks"
                component={WeeklyPicks}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('calendar-week'),
                    ...headerOptions({ navigation, title: 'PB\'s Weekly Picks' }),
                })}
                listeners={onPressItemLogEventListener('Weekly Picks')}
            />

            <Drawer.Screen
                name="Popular Events"
                component={PopularEvents}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('fire'),
                    ...headerOptions({ navigation, title: 'Popular Events' }),
                })}
                listeners={onPressItemLogEventListener('Popular Events')}
            />

            <Drawer.Screen
                name="Retreats"
                component={Retreats}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('campground'),
                    ...headerOptions({ navigation, title: 'Retreats' }),
                })}
                listeners={onPressItemLogEventListener('Retreats')}
            />

            <Drawer.Screen
                name="Munches"
                component={MunchesScreen}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('utensils'),
                    ...headerOptions({ navigation, title: 'Munches' }),
                })}
                listeners={onPressItemLogEventListener('Munches')}
            />


            <Drawer.Screen
                name="Play Parties"
                component={PlayParties}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('mask'),
                    ...headerOptions({ navigation, title: 'Play Parties' }),
                })}
                listeners={onPressItemLogEventListener('Play Parties')}
            />

            <Drawer.Screen
                name="Discover Game"
                component={DiscoverGame}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('gamepad'),
                    ...headerOptions({ navigation, title: 'Discover Game' }),
                })}
                listeners={({ navigation }) => ({
                    drawerItemPress: (e) => {
                        e.preventDefault();
                        logEvent(UE.DrawerItemPressed, {
                            ...analyticsProps,
                            screen_name: 'Discover Game',
                        });
                        navigateToTab(navigation, 'More', { screen: 'Discover Game' });
                    },
                })}
            />

            <Drawer.Screen
                name="Moar"
                component={Moar}
                options={({ navigation }) => ({
                    drawerIcon: getIcon('ellipsis-h'),
                    ...headerOptions({ navigation, title: 'Moar' }),
                })}
                listeners={onPressItemLogEventListener('Moar')}
            />

            {isAdmin && (
                <>
                    <Drawer.Screen
                        name="Admin"
                        component={AdminScreen}
                        options={({ navigation }) => ({
                            drawerIcon: getIcon('user-shield'),
                            ...headerOptions({ navigation, title: 'Admin' }),
                        })}
                        listeners={onPressItemLogEventListener('Admin')}
                    />
                    <Drawer.Screen
                        name="Import URLs"
                        component={ImportEventURLsScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Import URLs' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                    <Drawer.Screen
                        name="Weekly Picks Admin"
                        component={WeeklyPicksAdminScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Weekly Picks Admin' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                    <Drawer.Screen
                        name="Organizer Admin"
                        component={OrganizerAdminScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Organizer Admin' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                    <Drawer.Screen
                        name="Event Admin"
                        component={EventAdminScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Event Admin' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                    <Drawer.Screen
                        name="Promo Codes Admin"
                        component={PromoCodeAdminScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Promo Codes Admin' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                    <Drawer.Screen
                        name="Event Popups Admin"
                        component={EventPopupAdminScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Event Popups Admin' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                    <Drawer.Screen
                        name="Push Notifications Admin"
                        component={PushNotificationsAdminScreen}
                        options={({ navigation }) => ({
                            ...headerOptions({ navigation, title: 'Push Notifications Admin' }),
                            drawerLabel: () => null,
                            drawerItemStyle: { height: 0, marginVertical: 0 },
                        })}
                    />
                </>
            )}


        </Drawer.Navigator>
    );
};
