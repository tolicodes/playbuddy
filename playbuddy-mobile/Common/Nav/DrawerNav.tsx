import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HomeStackNavigator } from "./HomeNavigator";
import Communities from "../../Pages/Communities/CommunitiesNav";
import { Retreats } from "../../Pages/Retreats";
import BuddiesMain from "../../Pages/Buddies/screens/BuddiesMainScreen";
import { OrganizersNav } from "../../Pages/Organizers/OrganizersNav";
import Moar from "../../Pages/Moar";
import { headerOptions } from "../Header/Header";
import IonIcon from 'react-native-vector-icons/Ionicons';
import { SwipeMode } from "../../Pages/SwipeMode";
import MyCalendar from "../../Pages/MyCalendar";
import AuthMainScreen from "../../Pages/Auth/screens/AuthMainScreen";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import ProfileScreen from "../../Pages/Auth/screens/AuthProfileScreen";
import Admin from "../../Pages/Admin/Admin";
import AdminNav from "../../Pages/Admin/AdminNav";

const Drawer = createDrawerNavigator();

export const DrawerNav = () => {
    const { isDefaultsComplete } = useUserContext();

    return (

        <Drawer.Navigator initialRouteName="Home" screenOptions={headerOptions}>
            <Drawer.Screen
                name="HomeDrawer"
                component={HomeStackNavigator}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="home" size={size} color={color} />,
                    drawerLabel: 'Home',
                }}
                listeners={({ navigation }) => ({
                    drawerItemPress: (e) => {
                        e.preventDefault();

                        navigation.navigate('Home');
                    },
                })}
            />
            <Drawer.Screen
                name="Swipe Mode"
                component={SwipeMode}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="layer-group" size={size} color={color} style={{ width: 30 }} />,
                }}
            />
            <Drawer.Screen
                name="My Calendar"
                component={MyCalendar}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="heart" size={size} color={color} style={{ width: 30 }} />,
                }}
            />

            <Drawer.Screen
                name="Organizers"
                component={OrganizersNav}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="users-cog" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="Buddies"
                component={BuddiesMain}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="user-friends" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="Communities"
                component={Communities}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="users" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name={isDefaultsComplete ? "Profile" : "Auth"}
                component={isDefaultsComplete ? ProfileScreen : AuthMainScreen}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="user" size={size} color={color} style={{ width: 30 }} />,
                }}
            />
            <Drawer.Screen
                name="Retreats"
                component={Retreats}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="campground" size={size} color={color} />,
                }}
            />

            <Drawer.Screen
                name="Moar"
                component={Moar}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <IonIcon name="ellipsis-horizontal" size={size} color={color} />
                    ),
                }}
            />

            {/* <Drawer.Screen
                name="Admin"
                component={AdminNav}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <IonIcon name="ellipsis-horizontal" size={size} color={color} />
                    ),
                }}
            /> */}
        </Drawer.Navigator>
    );
};
