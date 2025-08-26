import React, { Suspense, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated, SafeAreaView } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
import HeaderLoginButton from "../../Pages/Auth/Buttons/HeaderLoginButton";
import { NavStack } from "../Nav/NavStackType";
import { logEvent } from "../hooks/logger";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../hooks/useAnalytics";
import { Image } from "react-native";
import { useRoute } from "@react-navigation/native";

// Custom Back Button
export const CustomBackButton = ({ navigation, backToWelcome }: { navigation: NavStack, backToWelcome?: boolean }) => {
    const analyticsProps = useAnalyticsProps();
    const onPress = () => {
        if (backToWelcome) {
            navigation.navigate('AuthNav', { screen: 'Welcome' });
        } else {
            navigation.goBack();
        }
        logEvent(UE.HeaderBackButtonClicked, analyticsProps);
    };

    return (
        <TouchableOpacity onPress={onPress} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back">
            <IonIcon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
    );
};

// Custom Drawer Button
export const HomeButton = ({ navigation }: { navigation: NavStack }) => {
    const onPressHomeButton = () => {
        navigation.navigate('Calendar');
    };
    return (
        <TouchableOpacity onPress={onPressHomeButton} accessibilityRole="button" accessibilityLabel="Menu">
            <Image style={styles.logo} source={require('../../assets/logo-transparent.png')} />
        </TouchableOpacity>
    );
};

// Header Title Text with Animation
const HeaderTitleText = ({ title, isSmall }: { title: string; isSmall?: boolean }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [title]);

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            <Text
                numberOfLines={1}
                style={[styles.headerTitleText, { fontSize: isSmall ? 24 : 35 }]}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.5}
            >
                {title}
            </Text>
        </Animated.View>
    );
};

// Header Right (Login)
export const HeaderRight = () => (
    <View style={styles.rightContainer}>
        <Suspense fallback={<ActivityIndicator color="#FFFFFF" />}>
            <HeaderLoginButton headerButton />
        </Suspense>
    </View>
);

// Main Header Component
const Header = ({ navigation, title, isRootScreen = false, backToWelcome = false }: { navigation: NavStack, title: string, isRootScreen?: boolean, backToWelcome?: boolean }) => {
    const route = useRoute();
    const routeTitle = route.params?.title;
    return (
        <SafeAreaView style={styles.headerContainer}>
            <View style={styles.headerInnerContainer}>
                <View style={styles.leftContainer}>
                    {isRootScreen
                        ? <HomeButton navigation={navigation} />
                        : <CustomBackButton navigation={navigation} backToWelcome={backToWelcome} />
                    }
                </View>

                <View style={styles.titleWrapper}>
                    <HeaderTitleText
                        title={routeTitle || title}
                        isSmall={routeTitle}
                    />
                </View>

                <HeaderRight />
            </View>
        </SafeAreaView>
    );
};

// Header Options for Navigation
export const headerOptions = ({
    navigation,
    title,
    isRootScreen = false,
    backToWelcome = false,
    analyticsProps,
}: {
    navigation: NavStack,
    title: string,
    isRootScreen?: boolean,
    backToWelcome?: boolean,
    analyticsProps?: any,
}) => ({
    header: () => <Header navigation={navigation} title={title} isRootScreen={isRootScreen} backToWelcome={backToWelcome} />,
    headerShown: true,
    onPress: () => {
        logEvent(UE.HeaderBackButtonClicked, {
            ...analyticsProps,
            tab_name: title || ''
        });
    },
});

// Simple Header Options for Details Pages
export const detailsPageHeaderOptions = ({ navigation }: { navigation: NavStack }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

// Styles
const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: 'transparent',
    },
    headerInnerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingBottom: 5,
    },
    leftContainer: {
        width: 50,
        justifyContent: 'center',
    },
    titleWrapper: {
        flex: 1,
        alignItems: 'flex-start',
    },
    rightContainer: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    iconButton: {
        padding: 10,
    },
    headerTitleText: {
        fontSize: 35,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },

    logo: {
        width: 50,
        height: 50,
    },
});

export default Header;
