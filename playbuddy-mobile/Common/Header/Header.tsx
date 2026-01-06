import React, { Suspense, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import IonIcon from 'react-native-vector-icons/Ionicons';
import HeaderLoginButton from "../../Pages/Auth/Buttons/HeaderLoginButton";
import { navigateToAuth, navigateToTab } from "../Nav/navigationHelpers";
import { logEvent } from "../hooks/logger";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../hooks/useAnalytics";
import { Image } from "react-native";
import { NavigationProp, ParamListBase, useRoute } from "@react-navigation/native";
import { colors, fontFamilies, fontSizes, spacing } from "../../components/styles";

// Custom Back Button
export const CustomBackButton = ({ navigation, backToWelcome }: { navigation: NavigationProp<ParamListBase>, backToWelcome?: boolean }) => {
    const analyticsProps = useAnalyticsProps();
    const onPress = () => {
        if (backToWelcome) {
            navigateToAuth(navigation, 'Welcome');
        } else if (navigation.canGoBack?.()) {
            navigation.goBack();
        } else {
            navigateToTab(navigation, 'Calendar');
        }
        logEvent(UE.HeaderBackButtonClicked, analyticsProps);
    };

    return (
        <TouchableOpacity onPress={onPress} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back">
            <IonIcon name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
    );
};

// Custom Drawer Button
export const HomeButton = ({ navigation }: { navigation: NavigationProp<ParamListBase> }) => {
    const onPressHomeButton = () => {
        navigateToTab(navigation, 'Calendar');
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
    const fontSize = isSmall ? fontSizes.title : fontSizes.display;
    const lineHeight = isSmall ? fontSizes.title + 2 : fontSizes.display + 2;

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
                style={[styles.headerTitleText, { fontSize, lineHeight }]}
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
        <Suspense fallback={<ActivityIndicator color={colors.white} />}>
            <HeaderLoginButton headerButton size={28} />
        </Suspense>
    </View>
);

// Main Header Component
const Header = ({
    navigation,
    title,
    isRootScreen = false,
    backToWelcome = false,
    backgroundColor,
}: {
    navigation: NavigationProp<ParamListBase>;
    title: string;
    isRootScreen?: boolean;
    backToWelcome?: boolean;
    backgroundColor?: string;
}) => {
    const route = useRoute();
    const routeTitle = route.params?.title;
    return (
        <SafeAreaView
            style={[styles.headerContainer, backgroundColor ? { backgroundColor } : null]}
            edges={['top', 'left', 'right']}
        >
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
    backgroundColor,
}: {
    navigation: NavigationProp<ParamListBase>,
    title: string,
    isRootScreen?: boolean,
    backToWelcome?: boolean,
    analyticsProps?: any,
    backgroundColor?: string,
}) => ({
    header: () => (
        <Header
            navigation={navigation}
            title={title}
            isRootScreen={isRootScreen}
            backToWelcome={backToWelcome}
            backgroundColor={backgroundColor}
        />
    ),
    headerShown: true,
    onPress: () => {
        logEvent(UE.HeaderBackButtonClicked, {
            ...analyticsProps,
            tab_name: title || ''
        });
    },
});

// Simple Header Options for Details Pages
export const detailsPageHeaderOptions = ({ navigation }: { navigation: NavigationProp<ParamListBase> }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

// Styles
const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: 'transparent',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
    },
    headerInnerContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: 0,
        paddingBottom: spacing.md,
    },
    leftContainer: {
        width: 44,
        justifyContent: 'center',
    },
    titleWrapper: {
        flex: 1,
        alignItems: 'flex-start',
    },
    rightContainer: {
        width: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    iconButton: {
        padding: spacing.sm,
    },
    headerTitleText: {
        fontSize: fontSizes.display,
        fontWeight: '600',
        color: colors.white,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
        includeFontPadding: false,
    },

    logo: {
        width: 40,
        height: 40,
    },
});

export default Header;
