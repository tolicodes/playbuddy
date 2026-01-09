import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
    Pressable,
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    StyleProp,
    ViewStyle,
    TextStyle,
} from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { NavStack } from "../../../Common/Nav/NavStackType";
import { navigateToAuth, navigateToHome, navigateToHomeStackScreen } from "../../../Common/Nav/navigationHelpers";
import { useUserContext } from "../hooks/UserContext";
import { getSmallAvatarUrl } from "../../../Common/hooks/imageUtils";
import { Image } from 'expo-image';
import { logEvent } from "../../../Common/hooks/logger";
import { UE } from "../../../userEventTypes";
import { useAnalyticsProps } from "../../../Common/hooks/useAnalytics";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../../components/styles";
import { ActionSheet } from "../../../components/ActionSheet";
import { getUnreadNotificationCount, subscribeToNotificationHistory } from "../../../Common/notifications/notificationHistory";
import { ADMIN_EMAILS } from "../../../config";

const HeaderLoginButton = ({
    showLoginText = false,
    size = 30,
    headerButton = false,
    register = false,
    onPressButton,
    entityToAccess = 'events',
    buttonStyle,
    textStyle,
    iconColor,
    avatarStyle,
}: {
    showLoginText?: boolean;
    size?: number;
    headerButton?: boolean;
    register?: boolean;
    onPressButton?: () => void;
    entityToAccess?: string;
    buttonStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    iconColor?: string;
    avatarStyle?: StyleProp<ViewStyle>;
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId, userProfile, isLoadingUserProfile, isLoadingAuth, isProfileComplete, signOut } = useUserContext();

    const analyticsProps = useAnalyticsProps();
    const route = useRoute();
    const analyticsPropsPlusEntity = {
        ...analyticsProps,
        entity_to_access: entityToAccess
    }
    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const useCustomMenu = true;
    const canSeeDebug = __DEV__ || (!!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email));
    const logDebug = useCallback((message: string, extra?: Record<string, unknown>) => {
        if (!__DEV__) return;
        if (extra) {
            console.log('[HeaderLoginButton]', message, extra);
        } else {
            console.log('[HeaderLoginButton]', message);
        }
    }, []);
    const getNavDebug = useCallback(() => {
        const state = navigation.getState?.();
        return state
            ? {
                index: state.index,
                routeNames: state.routeNames,
                routeCount: state.routes?.length,
            }
            : null;
    }, [navigation]);

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url);
    const initials = userProfile?.name?.split(' ').map(name => name[0]).join('').slice(0, 2);

    const refreshUnread = useCallback(async () => {
        if (!authUserId) {
            setUnreadCount(0);
            logDebug('refresh unread skipped (no auth)', { routeName: route.name });
            return;
        }
        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
        logDebug('refresh unread', { count, routeName: route.name });
    }, [authUserId, logDebug, route.name]);

    useEffect(() => {
        logDebug('mounted', { routeName: route.name });
        return () => {
            logDebug('unmounted', { routeName: route.name });
        };
    }, [route.name, logDebug]);

    useEffect(() => {
        void refreshUnread();
        const unsubscribe = navigation.addListener('focus', () => {
            logDebug('navigation focus', { routeName: route.name, nav: getNavDebug() });
            void refreshUnread();
        });
        return unsubscribe;
    }, [navigation, refreshUnread, route.name, logDebug, getNavDebug]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('blur', () => {
            logDebug('navigation blur', { routeName: route.name, nav: getNavDebug() });
            setMenuOpen(false);
        });
        return unsubscribe;
    }, [navigation, route.name, logDebug, getNavDebug]);

    useEffect(() => {
        const unsubscribe = subscribeToNotificationHistory(() => {
            void refreshUnread();
        });
        return unsubscribe;
    }, [refreshUnread]);

    useEffect(() => {
        if (menuOpen) {
            void refreshUnread();
        }
        logDebug('menu state', { menuOpen, routeName: route.name });
    }, [menuOpen, refreshUnread, route.name, logDebug]);

    useEffect(() => {
        if (menuOpen) {
            setMenuOpen(false);
        }
        logDebug('route key changed', { routeKey: route.key, routeName: route.name });
    }, [route.key, route.name, logDebug]);

    const handlePressHeaderButton = () => {
        logDebug('header press', {
            routeName: route.name,
            headerButton,
            authUserId: !!authUserId,
            menuOpen,
            nav: getNavDebug(),
        });
        logEvent(UE.HeaderLoginButtonClicked, analyticsPropsPlusEntity);
        if (onPressButton) {
            onPressButton();
        } else {
            if (headerButton && authUserId) {
                if (useCustomMenu) {
                    setMenuOpen((prev) => {
                        const next = !prev;
                        logDebug('menu toggle', { prev, next, routeName: route.name });
                        return next;
                    });
                    return;
                }
            }
            if (isProfileComplete) {
                navigateToAuth(navigation, 'Profile');
            } else {
                navigateToAuth(navigation, 'Login Form');
            }
        }
    };

    if (isLoadingUserProfile || isLoadingAuth) {
        return <ActivityIndicator />;
    }

    const resolvedIconColor = iconColor ?? (headerButton ? colors.textOnDarkStrong : colors.linkBlue);
    const sizeValue = showLoginText ? 50 : size;
    const containerStyle = headerButton ? styles.headerButtonContainer : styles.buttonContainer;
    const avatarContainerStyle = headerButton ? styles.headerAvatarContainer : styles.avatarContainer;
    const showBadge = headerButton && unreadCount > 0;
    const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
    const menuHeight = canSeeDebug ? 420 : 360;

    return (
        <>
            <TouchableOpacity
                style={[containerStyle, buttonStyle]}
                onPress={handlePressHeaderButton}
                onPressIn={() => logDebug('header press in', { routeName: route.name })}
                onPressOut={() => logDebug('header press out', { routeName: route.name })}
                onLongPress={() => logDebug('header long press', { routeName: route.name })}
            >
                <View style={[
                    avatarContainerStyle,
                    {
                        width: sizeValue,
                        height: sizeValue,
                        borderRadius: sizeValue / 2,
                    },
                    avatarStyle,
                ]}>
                    {authUserId ? (
                        avatarUrl ? (
                            <Image
                                source={{ uri: avatarUrl }}
                                style={[
                                    styles.avatarImage,
                                    { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 },
                                ]}
                            />
                        ) : (
                            <Text style={[styles.initialsText, { color: resolvedIconColor }]}>{initials}</Text>
                        )
                    ) : (
                        <FAIcon name="user" size={showLoginText ? 40 : 20} color={resolvedIconColor} />
                    )}
                    {showBadge && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>{badgeLabel}</Text>
                        </View>
                    )}
                </View>
                {showLoginText && (
                    <Text style={[styles.loginText, textStyle]}>
                        {register ? 'Register or Login' : 'Login'}
                    </Text>
                )}
            </TouchableOpacity>
            {useCustomMenu && (
                <ActionSheet
                    visible={menuOpen}
                    height={menuHeight}
                    debugId={`header-menu-${route.name}`}
                    sheetStyle={styles.sheetSurface}
                    backdropOpacity={0.45}
                    onClose={() => {
                        logDebug('action sheet close');
                        setMenuOpen(false);
                    }}
                    dismissOnBackdropPress
                >
                    <View style={styles.sheetHandle} />
                    <View style={styles.sheetHeader}>
                        <View>
                            <Text style={styles.sheetTitle}>Account</Text>
                            <Text style={styles.sheetSubtitle}>Quick links</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.sheetClose}
                            onPress={() => {
                                logDebug('menu close press', { routeName: route.name });
                                setMenuOpen(false);
                            }}
                        >
                            <FAIcon name="times" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.sheetDivider} />
                    <View style={styles.sheetActions}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.sheetItem,
                                styles.sheetItemShadow,
                                pressed && styles.sheetItemPressed,
                            ]}
                            onPress={() => {
                                logDebug('menu press: notifications', { routeName: route.name });
                                setMenuOpen(false);
                                if (!authUserId) {
                                    setTimeout(() => navigateToAuth(navigation, 'Login Form'), 0);
                                    return;
                                }
                                setTimeout(() => navigateToHomeStackScreen(navigation, 'Notifications'), 0);
                            }}
                        >
                            <View style={styles.sheetIconWrap}>
                                <FAIcon name="bell" size={16} color={colors.brandIndigo} />
                            </View>
                            <View style={styles.sheetTextWrap}>
                                <Text style={styles.sheetItemTitle}>Notifications</Text>
                                <Text style={styles.sheetItemSubtitle}>Recent reminders and updates</Text>
                            </View>
                            {unreadCount > 0 && (
                                <View style={styles.sheetBadge}>
                                    <Text style={styles.sheetBadgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                        {canSeeDebug && (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.sheetItem,
                                    styles.sheetItemShadow,
                                    pressed && styles.sheetItemPressed,
                                ]}
                                onPress={() => {
                                    logDebug('menu press: debug', { routeName: route.name });
                                    setMenuOpen(false);
                                    setTimeout(() => navigateToHomeStackScreen(navigation, 'Debug'), 0);
                                }}
                            >
                                <View style={styles.sheetIconWrap}>
                                    <FAIcon name="bug" size={16} color={colors.brandIndigo} />
                                </View>
                                <View style={styles.sheetTextWrap}>
                                    <Text style={styles.sheetItemTitle}>Debug</Text>
                                    <Text style={styles.sheetItemSubtitle}>Diagnostics and test tools</Text>
                                </View>
                                <FAIcon name="chevron-right" size={14} color={colors.textMuted} />
                            </Pressable>
                        )}
                        <Pressable
                            style={({ pressed }) => [
                                styles.sheetItem,
                                styles.sheetItemShadow,
                                pressed && styles.sheetItemPressed,
                            ]}
                            onPress={() => {
                                logDebug('menu press: settings', { routeName: route.name });
                                setMenuOpen(false);
                                setTimeout(() => {
                                    if (isProfileComplete) {
                                        navigateToAuth(navigation, 'Profile');
                                    } else {
                                        navigateToAuth(navigation, 'Login Form');
                                    }
                                }, 0);
                            }}
                        >
                            <View style={styles.sheetIconWrap}>
                                <FAIcon name="cog" size={16} color={colors.brandIndigo} />
                            </View>
                            <View style={styles.sheetTextWrap}>
                                <Text style={styles.sheetItemTitle}>Settings</Text>
                                <Text style={styles.sheetItemSubtitle}>Profile, preferences, and support</Text>
                            </View>
                            <FAIcon name="chevron-right" size={14} color={colors.textMuted} />
                        </Pressable>
                        {!!authUserId && (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.sheetItem,
                                    styles.sheetItemShadow,
                                    pressed && styles.sheetItemPressed,
                                ]}
                                onPress={() => {
                                    logDebug('menu press: sign out', { routeName: route.name });
                                    setMenuOpen(false);
                                    setTimeout(() => {
                                        logEvent(UE.AuthProfilePressSignOut, analyticsProps);
                                        signOut();
                                        navigateToHome(navigation);
                                    }, 0);
                                }}
                            >
                                <View style={styles.sheetIconWrap}>
                                    <FAIcon name="sign-out-alt" size={16} color={colors.brandIndigo} />
                                </View>
                                <View style={styles.sheetTextWrap}>
                                    <Text style={styles.sheetItemTitle}>Sign Out</Text>
                                    <Text style={styles.sheetItemSubtitle}>Log out of your account</Text>
                                </View>
                            </Pressable>
                        )}
                    </View>
                </ActionSheet>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        alignSelf: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.linkBlue,
        padding: spacing.smPlus,
        borderRadius: radius.smPlus,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
        // width: '100%',
        borderColor: colors.linkBlue,
        borderWidth: 2,
    },
    headerButtonContainer: {
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarContainer: {
        backgroundColor: colors.white,
        borderColor: colors.linkBlue,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarContainer: {
        backgroundColor: colors.surfaceGlassStrong,
        borderColor: colors.borderOnDark,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    avatarImage: {
        resizeMode: 'cover',
    },
    initialsText: {
        fontSize: fontSizes.base,
        fontWeight: 'bold',
        color: colors.linkBlue,
        fontFamily: fontFamilies.body,
    },
    loginText: {
        color: colors.white,
        fontWeight: 'bold',
        marginTop: 5,
        fontFamily: fontFamilies.body,
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    notificationBadgeText: {
        color: colors.white,
        fontSize: fontSizes.xs,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    sheetSurface: {
        backgroundColor: colors.surfaceLavenderOpaque,
        borderColor: colors.borderLavenderStrong,
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.borderLavenderActive,
        marginTop: spacing.sm,
        marginBottom: spacing.smPlus,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
    },
    sheetTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    sheetSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    sheetClose: {
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    sheetDivider: {
        height: 1,
        backgroundColor: colors.borderLavenderSoft,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
    },
    sheetActions: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xs,
        gap: spacing.sm,
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lgPlus,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
    },
    sheetItemShadow: {
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 3,
    },
    sheetItemPressed: {
        backgroundColor: colors.surfaceLavenderStrong,
        borderColor: colors.borderLavenderActive,
    },
    sheetIconWrap: {
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
    },
    sheetTextWrap: {
        flex: 1,
    },
    sheetItemTitle: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    sheetItemSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    sheetBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: spacing.xs,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetBadgeText: {
        color: colors.white,
        fontSize: fontSizes.xs,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
});

export default HeaderLoginButton;
