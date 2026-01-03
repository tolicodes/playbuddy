import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import HeaderLoginButton from "../Pages/Auth/Buttons/HeaderLoginButton";
import { logEvent } from "../Common/hooks/logger";
import { UE } from "../userEventTypes";
import { useAnalyticsProps } from "../Common/hooks/useAnalytics";
import { NavStack } from "../Common/Nav/NavStackType";
import { useUserContext } from "../Pages/Auth/hooks/UserContext";
import { colors, fontFamilies, fontSizes, gradients, radius, shadows, spacing } from "./styles";

export const LoginToAccess = ({ entityToAccess }: { entityToAccess: string }) => {
    const analyticsProps = useAnalyticsProps();
    const navigation = useNavigation<NavStack>();
    const { isProfileComplete } = useUserContext();

    const onPress = () => {
        logEvent(UE.LoginToAccessButtonClicked, {
            ...analyticsProps,
            entity_to_access: entityToAccess
        });

        if (isProfileComplete) {
            navigation.navigate('AuthNav', { screen: 'Profile' });
        } else {
            navigation.navigate('AuthNav', { screen: 'Login Form' });
        }
    };

    const title = entityToAccess ? `Login to access ${entityToAccess}` : "Login to access My Calendar";

    return (
        <LinearGradient
            colors={gradients.access}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.gradient}
        >
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowBottom} />
            <SafeAreaView style={styles.safe}>
                <View style={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.badgeRow}>
                            <View style={styles.badge}>
                                <FAIcon name="heart" size={14} color="#5B1FB8" />
                            </View>
                            <View style={[styles.badge, styles.badgeSecondary]}>
                                <FAIcon name="calendar-alt" size={14} color="#5B1FB8" />
                            </View>
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>
                            Save events to favorites and sync to your Google Calendar.
                        </Text>
                        <View style={styles.buttonWrap}>
                            <HeaderLoginButton
                                showLoginText
                                onPressButton={onPress}
                                entityToAccess={entityToAccess}
                                buttonStyle={styles.loginButton}
                                textStyle={styles.loginButtonText}
                                iconColor="#FFFFFF"
                                avatarStyle={styles.loginAvatar}
                            />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    glowTop: {
        position: 'absolute',
        top: -60,
        right: -70,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowTop,
    },
    glowBottom: {
        position: 'absolute',
        bottom: -40,
        left: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: colors.brandGlowBottom,
    },
    safe: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xxl,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: colors.white,
        borderRadius: radius.xl,
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(107,70,193,0.15)',
        ...shadows.brandCard,
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        marginBottom: spacing.mdPlus,
        gap: spacing.sm,
    },
    badge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(91,31,184,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(91,31,184,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeSecondary: {
        backgroundColor: 'rgba(192,79,212,0.12)',
        borderColor: 'rgba(192,79,212,0.25)',
    },
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        color: colors.brandText,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        marginTop: spacing.sm,
        fontSize: fontSizes.basePlus,
        color: '#5E4A78',
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: fontFamilies.body,
    },
    buttonWrap: {
        width: '100%',
        marginTop: spacing.lgPlus,
        alignItems: 'center',
    },
    loginButton: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: colors.brandBright,
        borderColor: colors.brandBright,
        borderWidth: 1,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        ...shadows.button,
    },
    loginButtonText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        marginTop: 0,
        marginLeft: spacing.smPlus,
        fontFamily: fontFamilies.body,
    },
    loginAvatar: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderColor: 'rgba(255,255,255,0.35)',
    },
});
