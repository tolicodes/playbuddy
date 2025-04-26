// HeaderOptions.tsx (Refactored Clean Version with Animation and Fixed PromoScreen Back Behavior)

import React, { Suspense, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
import { useCommonContext, ALL_COMMUNITIES_ID, ALL_LOCATION_AREAS_ID } from "../hooks/CommonContext";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useUpdateUserProfile } from "../../Pages/Auth/hooks/useUserProfile";
import { CommunityDropdown, LocationAreaDropdown } from "./DefaultsMenus";
import HeaderLoginButton from "../../Pages/Auth/Buttons/LoginButton";
import { NavStack } from "../Nav/NavStackType";
import { logEvent } from "../hooks/logger";
import { UE } from "../../commonTypes";

// Custom Back Button
export const CustomBackButton = ({ navigation }: { navigation: NavStack }) => {
    const onPress = () => {
        navigation.goBack();
        logEvent(UE.HeaderBackButtonClicked);
    };

    return (
        <View style={styles.backButtonContainer}>
            <TouchableOpacity onPress={onPress}>
                <IonIcon name="chevron-back" size={30} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );
};

// Custom Drawer Button
export const CustomDrawerButton = ({ navigation }: { navigation: NavStack }) => {
    const onPressToggleDrawer = () => {
        navigation.toggleDrawer();
        logEvent(UE.HeaderDrawerButtonClicked);
    };
    return (
        <View style={styles.drawerButtonContainer}>
            <TouchableOpacity onPress={onPressToggleDrawer}>
                <IonIcon name="menu" size={30} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );
};

// Header Title Text with Animation
const HeaderTitleText = ({ title }: { title: string }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [title]);

    return (
        <Animated.View style={{ ...styles.titleContainer, opacity: fadeAnim }}>
            <Text numberOfLines={1} style={styles.headerTitleText}>{title}</Text>
        </Animated.View>
    );
};

// Header Left Section (Button + Title)
const HeaderLeft = ({ navigation, isRootScreen, title }: { navigation: NavStack, isRootScreen: boolean, title: string }) => (
    <View style={styles.headerLeftContainer}>
        {isRootScreen ? <CustomDrawerButton navigation={navigation} /> : <CustomBackButton navigation={navigation} />}
        <HeaderTitleText title={title} />
    </View>
);

// Header Right (Community, Location, Login)
export const HeaderRight = () => {
    const { locationAreas, communities } = useCommonContext();
    const { selectedLocationAreaId, selectedCommunityId, authUserId } = useUserContext();
    const { mutate: updateUserProfile } = useUpdateUserProfile(authUserId || '');

    const setSelectedLocationAreaId = (id: string | null) => {
        updateUserProfile({ selected_location_area_id: id });
    };

    const setSelectedCommunityId = (id: string | null) => {
        updateUserProfile({ selected_community_id: id });
    };

    return (
        <View style={styles.rightNavContainer}>
            <CommunityDropdown
                communities={communities.interestGroups}
                selectedCommunityId={selectedCommunityId || ALL_COMMUNITIES_ID}
                onSelectCommunityId={setSelectedCommunityId}
            />
            <LocationAreaDropdown
                locationAreas={locationAreas}
                selectedLocationAreaId={selectedLocationAreaId || ALL_LOCATION_AREAS_ID}
                onSelectLocationAreaId={setSelectedLocationAreaId}
            />
            <Suspense fallback={<ActivityIndicator />}>
                <HeaderLoginButton headerButton />
            </Suspense>
        </View>
    );
};

// Smart Header Options (auto Drawer vs Back detection)
export const headerOptions = ({ navigation }: { navigation: NavStack }) => {
    const state = navigation.getState();

    const getDeepestRoute = (state: any): any => {
        if (!state || !state.routes || state.routes.length === 0) return null;
        const route = state.routes[state.index];
        if (route.state) {
            return getDeepestRoute(route.state);
        }
        return route;
    };

    const currentRoute = getDeepestRoute(state);
    const currentRouteName = currentRoute?.name;

    const rootScreens = ['Home', 'Calendar', 'Swipe Mode', 'My Calendar', 'Organizers', 'Auth', 'Weekly Picks'];

    const isRootScreen = rootScreens.includes(currentRouteName);

    if (currentRouteName === 'PromoScreen') {
        return {
            headerLeft: () => <View />,
            headerRight: () => <View />,
            headerTitle: 'Welcome!',
        };
    }

    let headerTitle = currentRouteName || 'Home';

    if (currentRoute?.name === 'Event Details' && currentRoute.params?.selectedEvent?.name) {
        headerTitle = currentRoute.params.selectedEvent.name;
    }

    return {
        headerTitle: '',
        headerLeft: () => <HeaderLeft navigation={navigation} isRootScreen={isRootScreen} title={headerTitle} />,
        headerRight: () => <HeaderRight />,
    };
};

// Simple Header Options for Details Pages
export const detailsPageHeaderOptions = ({ navigation }: { navigation: NavStack }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

// Styles
const styles = StyleSheet.create({
    rightNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    drawerButtonContainer: {
        marginLeft: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonContainer: {
        paddingLeft: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    titleContainer: {
        marginLeft: 8,
    },
    headerTitleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
});
