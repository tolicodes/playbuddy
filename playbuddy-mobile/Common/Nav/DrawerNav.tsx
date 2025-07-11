import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HomeStackNavigator } from "./HomeNavigator";
import { Retreats } from "../../Pages/Retreats";
import { headerOptions } from "../Header/Header";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import ProfileScreen from "../../Pages/Auth/screens/AuthProfileScreen";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import Moar from "../../Pages/Moar";
import LoginFormScreen from "../../Pages/Auth/screens/LoginFormScreen";
import { NavStack } from "./NavStackType";
import { WeeklyPicks } from "../../Pages/Auth/screens/Promo/WeeklyPicks";
import { PromosScreen } from "../../Pages/Auth/screens/Promo/PromosScreen";
import PlayParties from "../../Pages/PlayParties";
import { MunchesScreen } from '../../Pages/Munches/MunchesScreen'
import { FacilitatorsList } from "../../Pages/Facilitators/FacilitatorsList";
import { DiscoverGame } from "../../Pages/DiscoverGame/DiscoverGame";
import { Facilitators } from "../../Pages/Facilitators/Facilitators";

const Drawer = createDrawerNavigator();

export const DrawerNav = () => {
    const navigation = useNavigation<NavStack>();

    const getIcon = (name: string) => {
        const getter = ({ color, size }: { color: string, size: number }) => {
            return (<View style={{ flexDirection: 'column', alignItems: 'center', width: size + 5, height: size + 5 }}>
                <FAIcon name={name} size={size} color={color} />
            </View>)
        }
        return getter;
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
            />

            <Drawer.Screen
                name="Promos"
                component={PromosScreen}
                options={{
                    ...headerOptions({ navigation, title: 'Promos' }),
                    drawerIcon: ({ size }) => (
                        <View style={{ flexDirection: 'column', alignItems: 'center', width: size + 5, height: size + 5 }}>
                            <FAIcon name="ticket-alt" size={size} color="#FFD700" />
                        </View>
                    ),
                }}
            />


            <Drawer.Screen
                name="Weekly Picks"
                component={WeeklyPicks}
                options={{
                    drawerIcon: getIcon('calendar-week'),
                    ...headerOptions({ navigation, title: 'PB\'s Weekly Picks' }),

                }}
            />

            <Drawer.Screen
                name="Retreats"
                component={Retreats}
                options={{
                    drawerIcon: getIcon('campground'),
                    ...headerOptions({ navigation, title: 'Retreats' }),

                }}
            />

            <Drawer.Screen
                name="Munches"
                component={MunchesScreen}
                options={{
                    drawerIcon: getIcon('utensils'),
                    ...headerOptions({ navigation, title: 'Munches' }),

                }}
            />


            <Drawer.Screen
                name="Play Parties"
                component={PlayParties}
                options={{
                    drawerIcon: getIcon('mask'),
                    ...headerOptions({ navigation, title: 'Play Parties' }),

                }}
            />

            <Drawer.Screen
                name="Discover Game"
                component={DiscoverGame}
                options={{
                    drawerIcon: getIcon('gamepad'),
                    ...headerOptions({ navigation, title: 'Discover Game' }),

                }}
            />

            <Drawer.Screen
                name="Moar"
                component={Moar}
                options={{
                    drawerIcon: getIcon('ellipsis-h'),
                    ...headerOptions({ navigation, title: 'Moar' }),

                }}
            />


        </Drawer.Navigator>
    );
};
