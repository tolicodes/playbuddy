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

const Drawer = createDrawerNavigator();

export const DrawerNav = () => {
    const { isDefaultsComplete } = useUserContext();
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
                name={isDefaultsComplete ? "Profile" : "Login"}
                options={{
                    drawerIcon: getIcon('user'),
                    ...headerOptions({ navigation, title: isDefaultsComplete ? "Profile" : "Login" }),
                }}
                component={isDefaultsComplete ? ProfileScreen : LoginFormScreen}
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
