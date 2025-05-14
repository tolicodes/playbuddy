// HeaderOptions.tsx (Refactored Clean Version with Animation and Fixed PromoScreen Back Behavior)

import React, { Suspense, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
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

// Header Right (Login)
export const HeaderRight = () => {
    return (
        <View style={styles.rightNavContainer}>
            <Suspense fallback={<ActivityIndicator />}>
                <HeaderLoginButton headerButton />
            </Suspense>
        </View>
    );
};

// Smart Header Options (auto Drawer vs Back detection)
export const headerOptions = ({ navigation, title, isRootScreen = false }: { navigation: NavStack, title: string, isRootScreen?: boolean }) => {
    return {
        headerTitle: '',
        headerLeft: () => <HeaderLeft navigation={navigation} isRootScreen={isRootScreen} title={title} />,
        headerRight: () => <HeaderRight />,
        headerShown: true,
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
