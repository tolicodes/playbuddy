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
            colors={['#5B1FB8', '#8E2ACB', '#C04FD4']}
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
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -40,
        left: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(255,186,214,0.2)',
    },
    safe: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 28,
        paddingHorizontal: 22,
        borderWidth: 1,
        borderColor: 'rgba(107,70,193,0.15)',
        shadowColor: '#2b145a',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 6,
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        marginBottom: 14,
        gap: 8,
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
        fontSize: 20,
        fontWeight: '700',
        color: '#2C1A4A',
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14.5,
        color: '#5E4A78',
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonWrap: {
        width: '100%',
        marginTop: 18,
        alignItems: 'center',
    },
    loginButton: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#6B46C1',
        borderColor: '#6B46C1',
        borderWidth: 1,
        paddingVertical: 12,
        borderRadius: 14,
        shadowColor: '#2b145a',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 4,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 0,
        marginLeft: 10,
    },
    loginAvatar: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderColor: 'rgba(255,255,255,0.35)',
    },
});
