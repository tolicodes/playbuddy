import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HomeStackNavigator } from "./HomeNavigator";
import { Retreats } from "../../Pages/EventLists/Retreats";
import { headerOptions } from "../Header/Header";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import Moar from "../../Pages/Moar";
import { NavStack } from "./NavStackType";
import { WeeklyPicks } from "../../Pages/Entries/WeeklyPicks";
import { PromosListScreen } from "../../Pages/EventLists/PromosListScreen";
import PlayParties from "../../Pages/EventLists/PlayParties";
import { MunchesScreen } from '../../Pages/Munches/MunchesScreen'
import { DiscoverGame } from "../../Pages/DiscoverGame/DiscoverGame";
import { Facilitators } from "../../Pages/Facilitators/Facilitators";
import PopularEvents from "../../Pages/EventLists/PopularEvents";
import { logEvent } from "../hooks/logger";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../hooks/useAnalytics";

const Drawer = createDrawerNavigator();

export const DrawerNav = () => {
    const navigation = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();

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
                        navigation.navigate('Home');
                    },
                })}
            />

            <Drawer.Screen
                name="Facilitators"
                component={Facilitators}
                options={{
                    ...headerOptions({ navigation, title: 'Facilitators' }),
                    drawerIcon: getIcon('user-tie'),
                }}
                listeners={onPressItemLogEventListener('Facilitators')}
            />

            <Drawer.Screen
                name="Promos"
                component={PromosListScreen}
                options={{
                    ...headerOptions({ navigation, title: 'Promos' }),
                    drawerIcon: ({ size }) => (
                        <View style={{ flexDirection: 'column', alignItems: 'center', width: size + 5, height: size + 5 }}>
                            <FAIcon name="ticket-alt" size={size} color="#FFD700" />
                        </View>
                    ),
                }}
                listeners={onPressItemLogEventListener('Promos')}
            />


            <Drawer.Screen
                name="Weekly Picks"
                component={WeeklyPicks}
                options={{
                    drawerIcon: getIcon('calendar-week'),
                    ...headerOptions({ navigation, title: 'PB\'s Weekly Picks' }),

                }}
                listeners={onPressItemLogEventListener('Weekly Picks')}
            />

            <Drawer.Screen
                name="Popular Events"
                component={PopularEvents}
                options={{
                    drawerIcon: getIcon('fire'),
                    ...headerOptions({ navigation, title: 'Popular Events' }),
                }}
                listeners={onPressItemLogEventListener('Popular Events')}
            />

            <Drawer.Screen
                name="Retreats"
                component={Retreats}
                options={{
                    drawerIcon: getIcon('campground'),
                    ...headerOptions({ navigation, title: 'Retreats' }),

                }}
                listeners={onPressItemLogEventListener('Retreats')}
            />

            <Drawer.Screen
                name="Munches"
                component={MunchesScreen}
                options={{
                    drawerIcon: getIcon('utensils'),
                    ...headerOptions({ navigation, title: 'Munches' }),
                }}
                listeners={onPressItemLogEventListener('Munches')}
            />


            <Drawer.Screen
                name="Play Parties"
                component={PlayParties}
                options={{
                    drawerIcon: getIcon('mask'),
                    ...headerOptions({ navigation, title: 'Play Parties' }),

                }}
                listeners={onPressItemLogEventListener('Play Parties')}
            />

            <Drawer.Screen
                name="Discover Game"
                component={DiscoverGame}
                options={{
                    drawerIcon: getIcon('gamepad'),
                    ...headerOptions({ navigation, title: 'Discover Game' }),
                }}
                listeners={onPressItemLogEventListener('Discover Game')}
            />

            <Drawer.Screen
                name="Moar"
                component={Moar}
                options={{
                    drawerIcon: getIcon('ellipsis-h'),
                    ...headerOptions({ navigation, title: 'Moar' }),
                }}
                listeners={onPressItemLogEventListener('Moar')}
            />


        </Drawer.Navigator>
    );
};
