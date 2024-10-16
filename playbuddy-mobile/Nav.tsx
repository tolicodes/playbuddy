import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import * as amplitude from '@amplitude/analytics-react-native';

// Components
import EventCalendarView from './Calendar/EventCalendarView';
import { EventDetail } from './Calendar/EventDetail';
import { Filters } from './Calendar/Filters/Filters';
import AuthMain from './Auth/AuthMain';
import Wishlist from './Pages/Wishlist';
import Moar from './Pages/Moar';
import Communities from './Pages/Communities';
import HeaderLoginButton from './Auth/HeaderLoginButton';
import DeepLinkHandler from './DeepLinkHandler';
import { Retreats } from './Pages/Retreats';
import { Planner } from './Pages/Planner';
import LocationDropdown from './Header/LocationDropdown';
import CommunityDropdown from './Header/CommunitiesDropdown';
import BuddiesMain from './Buddies/BuddiesMain';
import { Organizers } from './Pages/Organizers/Organizers';
import { OrganizerEvents } from './Pages/Organizers/OrganizerEvents';

// Hooks and Contexts
import { useCommonContext } from './Common/CommonContext';
import { useUserContext } from './Auth/UserContext';
import { useCalendarContext } from './Calendar/CalendarContext';

// Navigation
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const CalendarStack = createStackNavigator();

// Helper Components
const CustomBackButton = ({ navigation }) => (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingLeft: 10 }}>
        <IonIcon name="chevron-back" size={30} color="#007AFF" />
    </TouchableOpacity>
);

const CustomDrawerButton = ({ navigation }) => {
    const { filters } = useCalendarContext();
    const hasFilters = !!filters.organizers.length;

    const onPressOpenFilters = () => {
        amplitude.logEvent('calendar_filters_clicked');
        navigation.navigate('Filters');
    };

    return (
        <View style={{ marginLeft: 15, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                <IonIcon name="menu" size={30} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterIcon} onPress={onPressOpenFilters}>
                <FAIcon name="filter" size={20} color={hasFilters ? "#007AFF" : "#8E8E93"} />
            </TouchableOpacity>
        </View>
    );
};

// Navigation Options
const detailsPageHeaderOptions = ({ navigation }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

const headerOptions = ({ navigation }) => ({
    headerRight: () => {
        const {
            locationAreas,
            communities,
            selectedLocationArea,
            setSelectedLocationArea,
            selectedCommunity,
            setSelectedCommunity,
        } = useCommonContext();

        return (
            <View style={styles.rightNavContainer}>
                <CommunityDropdown
                    communities={communities.interestGroups}
                    selectedCommunity={selectedCommunity}
                    onSelectCommunity={setSelectedCommunity}
                />
                <LocationDropdown
                    locationAreas={locationAreas}
                    selectedLocationArea={selectedLocationArea}
                    onSelectLocationArea={setSelectedLocationArea}
                />
                <HeaderLoginButton />
            </View>
        );
    },
    headerLeft: () => <CustomDrawerButton navigation={navigation} />
});

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
            <CalendarStack.Screen name="Organizer Events" component={OrganizerEvents} />
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
                    Wishlist: "heart",
                    Communities: "users",
                    Moar: "ellipsis-horizontal"
                }[route.name];
                return route.name === 'Moar'
                    ? <IonIcon name={iconName} size={size} color={color} />
                    : <FAIcon name={iconName} size={size} color={color} />;
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
        <Tab.Screen name="Wishlist" component={Wishlist} />
    </Tab.Navigator>
);

// Drawer Navigator
const DrawerNav = () => {
    const { authUserId } = useUserContext();
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
                component={Planner}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="layer-group" size={size} color={color} style={{ width: 30 }} />,
                }}
            />
            <Drawer.Screen
                name="Wishlist"
                component={Wishlist}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="heart" size={size} color={color} style={{ width: 30 }} />,
                }}
            />

            <Drawer.Screen
                name="Organizers"
                component={Organizers}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="users-cog" size={size} color={color} style={{ width: 30 }} />,
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
                name="Buddies"
                component={BuddiesMain}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="user-friends" size={size} color={color} style={{ width: 30 }} />,
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
                name={authUserId ? "Profile" : "Login"}
                component={AuthMain}
                options={{
                    drawerIcon: ({ color, size }) => <FAIcon name="user" size={size} color={color} style={{ width: 30 }} />,
                }}
            />

            <Drawer.Screen name="Moar" component={Moar}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <IonIcon name="ellipsis-horizontal" size={size} color={color} />
                    )
                }}

            />

        </Drawer.Navigator>
    );
};

// Root Navigator
export default function AppNavigator() {
    return (
        <NavigationContainer>
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
        paddingHorizontal: 10,
    },
    filterIcon: {
        marginLeft: 10,
    },
});
