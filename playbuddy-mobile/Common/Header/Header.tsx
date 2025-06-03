// HeaderOptions.tsx (Refactored Clean Version with Animation and Fixed PromoScreen Back Behavior)

import React, { Suspense, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated, SafeAreaView } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
import HeaderLoginButton from "../../Pages/Auth/Buttons/LoginButton";
import { NavStack } from "../Nav/NavStackType";
import { logEvent } from "../hooks/logger";
import { UE } from "../../commonTypes";
import { LAVENDER_BACKGROUND } from "../../styles";

// Custom Back Button
export const CustomBackButton = ({ navigation, backToWelcome }: { navigation: NavStack, backToWelcome?: boolean }) => {
    const onPress = () => {
        if (backToWelcome) {
            navigation.navigate('AuthNav', { screen: 'Welcome' });
        } else {
            navigation.goBack();
        }
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
const HeaderLeft = ({ navigation, isRootScreen, title, backToWelcome }: { navigation: NavStack, isRootScreen: boolean, title: string, backToWelcome?: boolean }) => (
    <View style={styles.headerLeftContainer}>
        {isRootScreen ? <CustomDrawerButton navigation={navigation} /> : <CustomBackButton navigation={navigation} backToWelcome={backToWelcome} />}
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

const Header = ({ navigation, title, isRootScreen = false, backToWelcome = false }: { navigation: NavStack, title: string, isRootScreen?: boolean, backToWelcome?: boolean }) => {
    return (
        <SafeAreaView style={styles.headerContainer}>
            <View style={styles.headerInnerContainer}>
                <HeaderLeft navigation={navigation} isRootScreen={isRootScreen} title={title} backToWelcome={backToWelcome} />
                <HeaderRight />
            </View>
        </SafeAreaView>
    );
};

// Smart Header Options (auto Drawer vs Back detection)
export const headerOptions = ({ navigation, title, isRootScreen = false, backToWelcome = false }: { navigation: NavStack, title: string, isRootScreen?: boolean, backToWelcome?: boolean }) => {
    return {
        header: () => <Header navigation={navigation} title={title} isRootScreen={isRootScreen} backToWelcome={backToWelcome} />,
        headerShown: true,
    };
};

// Simple Header Options for Details Pages
export const detailsPageHeaderOptions = ({ navigation }: { navigation: NavStack }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

// Styles
const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    headerInnerContainer: {
        flex: 1,
        paddingRight: 10,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
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
