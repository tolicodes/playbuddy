import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { TouchableOpacity, Text, View } from 'react-native';
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
import AddEventForm from './Pages/AddEventForm/AddEventForm';
import Markdown from 'react-native-markdown-display';

import { Retreats } from './Pages/Retreats';

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

const COMING_SOON = `
- **Tinder Mode**: Swipe on events to plan your week.
- **Plan with Buddies**: Building on Tinder Mode, drag events into Buddy Lists and share with your various circles  (e.g., Toli’s Kinky Polycule, Rope Bunnies, or (Actual) Platonic Daddies Who Don’t Know I’m Kinky).
- **AI Filtering**: Machine Learning will auto-classify events by type (e.g., workshop, talk, hands-on, play party) and comfort level (e.g., platonic,  sensual, erotic, sexual, 😳) 
- **Communities**: Support for public and private communities, mirroring WhatsApp/Discord groups like this one, with automatic event aggregation.
- **Organizers**: View all your favorite organizers in one place, and see their upcoming events.`

const ComingSoon = () => (<View style={{ padding: 20 }}>
    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Coming Soon</Text>
    <Markdown>{COMING_SOON}</Markdown>
</View>)

// Create the Drawer Navigator
const DrawerNav = () => {
    return (
        <Drawer.Navigator initialRouteName="Home" >
            <Drawer.Screen
                name="Home"
                component={TabNavigator}
                options={({ route }) => ({
                    headerRight: (props) => {
                        return <HeaderLoginButton />
                    },
                    headerTitle: () => {
                        const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home'
                        return <Text style={{ fontSize: 17, fontWeight: 'bold' }}>{routeName}</Text>
                    },
                    drawerIcon: ({ color, size }) => <FAIcon name="calendar" size={size} color={color} style={{ width: 30 }} />
                })}
            />

            <Drawer.Screen
                name="Login"
                component={AuthMain}
                options={() => ({
                    drawerIcon: ({ color, size }) => <FAIcon name="user" size={size} color={color} style={{ width: 30 }} />
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

            {/* <Drawer.Screen
                name="Friends"
                component={ComingSoon}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="user-friends" size={size} color={color} style={{ width: 30 }} /> }}
            />
            <Drawer.Screen
                name="Organizers"
                component={ComingSoon}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="users-cog" size={size} color={color} style={{ width: 30 }} /> }}
            />
            <Drawer.Screen
                name="Communities"
                component={Communities}
                options={{ drawerIcon: ({ color, size }) => <FAIcon name="users" size={size} color={color} style={{ width: 30 }} /> }}
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
