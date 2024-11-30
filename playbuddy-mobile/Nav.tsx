import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer, NavigationProp, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import * as amplitude from '@amplitude/analytics-react-native';

// Components
import EventCalendarView from './Pages/Calendar/EventCalendarView';
import { EventDetail } from './Pages/Calendar/EventDetail';
import AuthScreen from './Pages/Auth/screens/AuthMainScreen';
import MyCalendar from './Pages/MyCalendar';
import Moar from './Pages/Moar';
import Communities from './Pages/Communities/CommunitiesNav';
import DeepLinkHandler from './DeepLinkHandler';
import { Retreats } from './Pages/Retreats';
import { SwipeMode } from './Pages/SwipeMode';
import BuddiesMain from './Pages/Buddies/screens/BuddiesMainScreen';
import ProfileScreen from './Pages/Auth/screens/AuthProfileScreen';
// Hooks and Contexts
import BuddyEvents from './Pages/Buddies/screens/BuddyEventsScreen';
import { CommunityEvents } from './Pages/Communities/CommunityEvents';
import { detailsPageHeaderOptions, headerOptions } from './Common/Header/Header';
import { Filters } from './Pages/Calendar/Filters/Filters';
import { tagScreenName } from './Common/hooks/uxCam';
import { useUserContext } from './Pages/Auth/hooks/UserContext';

// Navigation
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const CalendarStack = createStackNavigator();

// Stack Navigators
function CalendarStackNavigator() {
    return (
        <CalendarStack.Navigator screenOptions={detailsPageHeaderOptions}>
            <CalendarStack.Screen
                name="Main Calendar"
                component={EventCalendarView}
                options={{ headerShown: false }}
            />
            <CalendarStack.Screen name="Event Details" component={EventDetail} />
            <CalendarStack.Screen name="Community Events" component={CommunityEvents} />
            <CalendarStack.Screen name="Buddy Events" component={BuddyEvents} />
            <CalendarStack.Screen name="Filters" component={Filters} />

            <CalendarStack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: false }}
            />
        </CalendarStack.Navigator>
    );
}

// Tab Navigator
const TabNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
                const iconName = {
                    Calendar: "calendar",
                    'My Calendar': "heart",
                    'Swipe Mode': "layer-group"
                }[route.name];
                return <FAIcon name={iconName} size={size} color={color} />;
            },
            tabBarButton: (props) => (
                <TouchableOpacity
                    {...props}
                    onPress={() => {
                        amplitude.logEvent('Tab Clicked', { tabName: route.name });
                        props.onPress?.();
                    }}
                />
            ),
            headerShown: false
        })}
    >
        <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
        <Tab.Screen name="My Calendar" component={MyCalendar} />
        <Tab.Screen name="Swipe Mode" component={SwipeMode} />
    </Tab.Navigator>
);

// Drawer Navigator
const DrawerNav = () => {
    const { isProfileComplete } = useUserContext();

    return (
        <Drawer.Navigator initialRouteName="Home" screenOptions={headerOptions}>
            <Drawer.Screen
                name="Home"
                component={TabNavigator}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="calendar" size={size} color={color} style={{ width: 30 }} />,
                }}
                listeners={({ navigation }) => ({
                    drawerItemPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Home', { screen: 'Calendar' });
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
                name="Buddies"
                component={BuddiesMain}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="user-friends" size={size} color={color} style={{ width: 30 }} />,
                }}
            />

            <Drawer.Screen
                name="Communities"
                component={Communities}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="users" size={size} color={color} style={{ width: 30 }} />,
                }}
            />

            <Drawer.Screen
                name="Retreats"
                component={Retreats}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="campground" size={size} color={color} style={{ width: 30 }} />,
                }}
            />
            <Drawer.Screen
                name={isProfileComplete ? "Profile" : "Auth"}
                component={isProfileComplete ? ProfileScreen : AuthScreen}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="user" size={size} color={color} style={{ width: 30 }} />,
                }}
            />

            <Drawer.Screen name="Moar" component={Moar}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <IonIcon name="ellipsis-horizontal" size={size} color={color} style={{ width: 30 }} />
                    )
                }}
            />

        </Drawer.Navigator>
    );
};

// Root Navigator
export default function AppNavigator() {
    return (
        <NavigationContainer
            onStateChange={(state) => {
                if (!state) return;

                // Get the current route
                const currentRoute = state.routes[state.index];
                if (currentRoute?.name) {
                    tagScreenName(currentRoute.name);
                }
            }}
        >
            <DeepLinkHandler />
            <DrawerNav />
        </NavigationContainer>
    );
}
