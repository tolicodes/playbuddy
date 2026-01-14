import React, { Suspense, useEffect, useMemo, useRef } from "react";
import {
    View,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    Animated,
    Platform,
    StatusBar,
    Alert,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import IonIcon from 'react-native-vector-icons/Ionicons';
import HeaderLoginButton from "../../Pages/Auth/Buttons/HeaderLoginButton";
import { navigateToAuth, navigateToTab } from "../Nav/navigationHelpers";
import { logEvent } from "../hooks/logger";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../hooks/useAnalytics";
import { NavigationProp, ParamListBase, useRoute } from "@react-navigation/native";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../components/styles";
import { useCommonContext } from "../hooks/CommonContext";
import { useJoinCommunity, useLeaveCommunity } from "../hooks/useCommunities";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import type { NavStackProps } from "../Nav/NavStackType";

// Custom Back Button
export const CustomBackButton = ({ navigation, backToWelcome }: { navigation: NavigationProp<ParamListBase>, backToWelcome?: boolean }) => {
    const analyticsProps = useAnalyticsProps();
    const onPress = () => {
        if (backToWelcome) {
            navigateToAuth(navigation, 'Login Form');
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
        navigateToTab(navigation, 'Calendar', { scrollToTop: Date.now() });
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

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const CommunityHeaderFollowButton = ({
    communityId,
    communityIds,
}: {
    communityId?: string;
    communityIds?: string[];
}) => {
    const { authUserId } = useUserContext();
    const { myCommunities } = useCommonContext();
    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();

    const joinableIds = useMemo(() => {
        const ids = communityIds?.length ? communityIds : communityId ? [communityId] : [];
        return ids.filter((id) => isUuid(id));
    }, [communityId, communityIds]);

    const myCommunityIds = useMemo(
        () => new Set(myCommunities.allMyCommunities?.map((community) => community.id) || []),
        [myCommunities]
    );

    const isJoined = joinableIds.some((id) => myCommunityIds.has(id));
    const canFollow = joinableIds.length > 0;

    const handlePress = () => {
        if (!canFollow) return;
        if (!authUserId) {
            Alert.alert('Create an account to join a community!');
            return;
        }
        if (isJoined) {
            joinableIds.forEach((targetId) => {
                if (!myCommunityIds.has(targetId)) return;
                leaveCommunity.mutate({ community_id: targetId });
                logEvent('community_events_community_left', { communityId: targetId });
            });
            return;
        }
        joinableIds.forEach((targetId) => {
            if (myCommunityIds.has(targetId)) return;
            joinCommunity.mutate({ community_id: targetId, type: 'organizer_public_community' });
            logEvent('community_events_community_joined', { communityId: targetId });
        });
    };

    return (
        <TouchableOpacity
            style={[
                styles.headerFollowButton,
                isJoined ? styles.headerFollowButtonActive : styles.headerFollowButtonInactive,
                !canFollow && styles.headerFollowButtonDisabled,
            ]}
            onPress={handlePress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isJoined ? "Following community" : "Follow community"}
            disabled={!canFollow}
        >
            <IonIcon
                name={isJoined ? "heart" : "heart-outline"}
                size={16}
                color={isJoined ? colors.white : colors.headerPurple}
                style={styles.headerFollowIcon}
            />
            <Text style={[styles.headerFollowText, isJoined && styles.headerFollowTextActive]}>
                {isJoined ? "Following" : "Follow"}
            </Text>
        </TouchableOpacity>
    );
};

// Header Right (Login)
export const HeaderRight = () => {
    const route = useRoute();
    const communityParams =
        route.name === 'Community Events'
            ? (route.params as Partial<NavStackProps['Community Events']> | undefined)
            : undefined;

    return (
        <View style={styles.rightContainer}>
            {communityParams && (
                <CommunityHeaderFollowButton
                    communityId={communityParams.communityId}
                    communityIds={communityParams.communityIds}
                />
            )}
            <Suspense fallback={<ActivityIndicator color={colors.white} />}>
                <HeaderLoginButton headerButton size={28} />
            </Suspense>
        </View>
    );
};

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
        paddingHorizontal: spacing.lg,
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
        minWidth: 44,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    headerFollowButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.smPlus,
        borderRadius: radius.pill,
        borderWidth: 1,
        marginRight: spacing.sm,
    },
    headerFollowButtonActive: {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.borderOnDarkStrong,
    },
    headerFollowButtonInactive: {
        backgroundColor: colors.white,
        borderColor: colors.white,
    },
    headerFollowButtonDisabled: {
        opacity: 0.5,
    },
    headerFollowIcon: {
        marginRight: spacing.xs,
    },
    headerFollowText: {
        color: colors.headerPurple,
        fontSize: fontSizes.smPlus,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
    headerFollowTextActive: {
        color: colors.white,
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
