import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import * as amplitude from '@amplitude/analytics-react-native';

import EventCalendarView from './Calendar/EventCalendarView';
import { EventDetail } from './Calendar/EventDetail';
import { Filters } from './Calendar/Filters/Filters';
import AuthMain from './Auth/AuthMain';
import Wishlist from './Pages/Wishlist';
import Moar from './Pages/Moar';
import Communities from './Pages/Communities';
import HeaderLoginButton from './Auth/HeaderLoginButton';
import DeepLinkHandler from './DeepLinkHandler';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';

import { Retreats } from './Pages/Retreats';
import { Planner } from './Pages/Planner';
import LocationDropdown, { LocationArea } from './Header/LocationDropdown';
import CommunityDropdown, { Community } from './Header/CommunitiesDropdown';
import { useCommon } from './Common/CommonContext';
import BuddiesMain from './Buddies/BuddiesMain';
import { useUserContext } from './Auth/UserContext';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const CalendarStack = createStackNavigator();

function CalendarStackNavigator() {
    return (
        <CalendarStack.Navigator>
            <CalendarStack.Screen
                name="Main Calendar"
                component={EventCalendarView}
                options={{ headerShown: false }}
            />
            {/* Only accessible from Calendar */}
            <CalendarStack.Screen
                name="Event Details"
                component={EventDetail}
            />
        </CalendarStack.Navigator>
    );
}

// Bottom Tabs (Calendar, Wishlist, Communities, Moar)
const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Calendar') return <FAIcon name="calendar" size={size} color={color} />;
                    if (route.name === 'Wishlist') return <FAIcon name="heart" size={size} color={color} />;
                    if (route.name === 'Communities') return <FAIcon name="users" size={size} color={color} />;
                    if (route.name === 'Moar') return <IonIcon name="ellipsis-horizontal" size={size} color={color} />;
                },
                tabBarButton: (props) => (
                    <TouchableOpacity
                        {...props}
                        onPress={() => {
                            amplitude.logEvent('Tab Clicked', { tabName: route.name });
                            if (props.onPress) props.onPress();
                        }}
                    />
                ),
                //  We are using the header in the Drawer Navigator
                headerShown: false
            })}
        >

            <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
            <Tab.Screen name="Wishlist" component={Wishlist} />
            <Tab.Screen name="Moar" component={Moar} />

        </Tab.Navigator >
    );
};

// Create the Drawer Navigator
const DrawerNav = () => {
    const { authUserId } = useUserContext();
    return (
        <Drawer.Navigator initialRouteName="Home" >
            <Drawer.Screen
                name="Home"
                component={TabNavigator}
                options={({ route, navigation }) => ({
                    headerRight: () => {
                        const {
                            locationAreas,
                            communities,
                            selectedLocationArea,
                            setSelectedLocationArea,
                            selectedCommunity,
                            setSelectedCommunity,
                        } = useCommon();

                        const handleSelectLocationArea = (locationArea: LocationArea) => {
                            setSelectedLocationArea(locationArea);
                        };

                        const handleSelectCommunity = (community: Community | null) => {
                            setSelectedCommunity(community);
                        };

                        return (
                            <View style={styles.rightNavContainer}>
                                <CommunityDropdown
                                    communities={communities}
                                    selectedCommunity={selectedCommunity}
                                    onSelectCommunity={handleSelectCommunity}
                                />
                                <LocationDropdown
                                    locationAreas={locationAreas}
                                    selectedLocationArea={selectedLocationArea}
                                    onSelectLocationArea={handleSelectLocationArea}
                                />
                                <HeaderLoginButton />
                            </View>
                        )
                    },
                    headerTitle: () => {
                        const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home'
                        return <Text style={{ fontSize: 17, fontWeight: 'bold' }}>{routeName}</Text>
                    },
                    drawerIcon: ({ color, size }) => <FAIcon name="calendar" size={size} color={color} style={{ width: 30 }} />
                })}
                listeners={({ navigation }) => ({
                    drawerItemPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Home', { screen: 'Calendar' });
                    },
                })}
            />

            <Drawer.Screen
                name={authUserId ? "Profile" : "Login"}
                component={AuthMain}
                options={() => ({
                    drawerIcon: ({ color, size }) => <FAIcon name="user" size={size} color={color} style={{ width: 30 }} />
                })}
            />

            <Drawer.Screen
                name="Swipe Mode"
                component={Planner}
                options={() => ({
                    drawerIcon: ({ color, size }) => <FAIcon name="book" size={size} color={color} style={{ width: 30 }} />
                })}
            />

            <Drawer.Screen
                name="Filters"
                component={Filters}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="filter" size={size} color={color} style={{ width: 30 }} /> }}
            />

            <Drawer.Screen
                name="Wishlist"
                component={Wishlist}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="heart" size={size} color={color} style={{ width: 30 }} /> }}
            />
            <Drawer.Screen
                name="Retreats"
                component={Retreats}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="campground" size={size} color={color} style={{ width: 30 }} /> }}
            />

            <Drawer.Screen
                name="Communities"
                component={Communities}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="users" size={size} color={color} style={{ width: 30 }} /> }}
            />

            <Drawer.Screen
                name="Buddies"
                component={BuddiesMain}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="user-friends" size={size} color={color} style={{ width: 30 }} /> }}
            />
            {/*
            <Drawer.Screen
                name="Organizers"
                component={ComingSoon}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="users-cog" size={size} color={color} style={{ width: 30 }} /> }}
            />
           

            <Drawer.Screen
                name="Add Event"
                component={ComingSoon}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="plus" size={size} color={color} style={{ width: 30 }} /> }}
            /> */}
        </Drawer.Navigator>
    );
};

// Root Stack with both Tab and Drawer Navigators
export default function AppNavigator() {
    return (
        <NavigationContainer>
            {/* For sharing wishlist */}
            <DeepLinkHandler />

            <DrawerNav />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    rightNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Add padding or margin as needed
        paddingHorizontal: 10,
    },
});

