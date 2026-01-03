import React, { useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input, Button } from '@rneui/themed';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useUserContext } from './hooks/UserContext';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

const Tab = createMaterialTopTabNavigator();
interface LoginProps {
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    isSignUp: boolean;
    confirmPassword?: string;
    setConfirmPassword?: (confirmPassword: string) => void;
}

const Login: React.FC<LoginProps> = ({
    email,
    setEmail,
    password,
    setPassword,
    isSignUp,
    confirmPassword,
    setConfirmPassword,
}) => {
    const { signUpWithEmail, signInWithEmail } = useUserContext();
    const analyticsProps = useAnalyticsProps();

    const handleSignUp = () => {
        logEvent(UE.AuthEmailLoginPressSignupWithEmail, analyticsProps);
        signUpWithEmail(email, password);
    }
    const handleSignIn = () => {
        logEvent(UE.AuthEmailLoginPressLoginWithEmail, analyticsProps);
        signInWithEmail(email, password);
    }

    return (
        <View style={styles.loginContainer} >
            <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                containerStyle={styles.inputContainer}
                inputContainerStyle={styles.inputInner}
                inputStyle={styles.inputText}
                placeholderTextColor="#9C8FB3"
                errorStyle={styles.errorText}
                leftIcon={{ type: 'font-awesome', name: 'envelope', color: colors.brandBright, size: 16 }}
                leftIconContainerStyle={styles.leftIcon}
                autoCapitalize='none'
            />
            <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                containerStyle={styles.inputContainer}
                inputContainerStyle={styles.inputInner}
                inputStyle={styles.inputText}
                placeholderTextColor="#9C8FB3"
                errorStyle={styles.errorText}
                leftIcon={{ type: 'font-awesome', name: 'lock', color: colors.brandBright, size: 16 }}
                leftIconContainerStyle={styles.leftIcon}
                autoCapitalize='none'
            />
            {isSignUp && (
                <Input
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    secureTextEntry
                    containerStyle={styles.inputContainer}
                    inputContainerStyle={styles.inputInner}
                    inputStyle={styles.inputText}
                    placeholderTextColor="#9C8FB3"
                    errorStyle={styles.errorText}
                    leftIcon={{ type: 'font-awesome', name: 'lock', color: colors.brandBright, size: 16 }}
                    leftIconContainerStyle={styles.leftIcon}
                    autoCapitalize='none'
                />
            )}
            <Button
                title={isSignUp ? "Sign Up" : "Sign In"}
                onPress={isSignUp ? handleSignUp : handleSignIn}
                buttonStyle={styles.button}
                titleStyle={styles.buttonTitle}
                containerStyle={styles.buttonContainer}
                raised
            />
        </View>
    );
}

export const EmailLogin: React.FC<{ onSwitchToPhone: () => void; }> = ({ onSwitchToPhone }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    return (
        <View style={styles.emailContainer}>
            <View style={styles.headerRow}>
                <View style={styles.headerBadge}>
                    <FAIcon name="envelope" size={14} color="#6B46C1" />
                </View>
                <Text style={styles.header}>Email</Text>
            </View>
            <Tab.Navigator
                style={styles.tabNavigator}
                screenOptions={{
                    tabBarStyle: styles.tabBar,
                    tabBarIndicatorStyle: styles.tabIndicator,
                    tabBarLabelStyle: styles.tabLabel,
                    tabBarItemStyle: styles.tabItem,
                    tabBarActiveTintColor: colors.brandText,
                    tabBarInactiveTintColor: colors.brandTextMuted,
                    tabBarPressColor: 'transparent',
                }}
            >
                <Tab.Screen name="Sign Up">
                    {() => <Login
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        isSignUp={true}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                    />}
                </Tab.Screen>

                <Tab.Screen name="Login">
                    {() => <Login
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        isSignUp={false}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                    />}
                </Tab.Screen>

            </Tab.Navigator>
            <TouchableOpacity onPress={onSwitchToPhone}>
                <Text style={styles.switchText}>Use phone instead</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    emailContainer: {
        padding: spacing.xl,
        backgroundColor: colors.white,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: 'rgba(107,70,193,0.12)',
        justifyContent: 'center',
        ...shadows.brandCard,
    },
    loginContainer: {
        paddingTop: spacing.mdPlus,
    },
    tabNavigator: {
        minHeight: 300,
    },
    tabBar: {
        backgroundColor: colors.surfaceSoft,
        borderRadius: radius.pill,
        padding: spacing.xxs,
        height: 40,
        marginBottom: spacing.mdPlus,
        borderWidth: 1,
        borderColor: 'rgba(107,70,193,0.12)',
    },
    tabIndicator: {
        top: spacing.xxs,
        bottom: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: colors.white,
    },
    tabLabel: {
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        textTransform: 'none',
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
        paddingVertical: 0,
        fontFamily: fontFamilies.body,
    },
    tabItem: {
        height: 36,
        paddingVertical: 0,
        paddingHorizontal: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: spacing.smPlus,
    },
    headerBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.badgeBackground,
        borderWidth: 1,
        borderColor: colors.badgeBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    header: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.brandText,
        fontFamily: fontFamilies.display,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    inputInner: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.badgeBorder,
        backgroundColor: colors.surfaceSoft,
        paddingHorizontal: spacing.smPlus,
    },
    inputText: {
        fontSize: fontSizes.lg,
        color: colors.brandText,
        fontFamily: fontFamilies.body,
    },
    leftIcon: {
        marginRight: spacing.sm,
    },
    switchText: {
        marginTop: spacing.sm,
        color: colors.brandBright,
        textAlign: 'center',
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        textDecorationLine: 'underline',
    },
    button: {
        backgroundColor: colors.brandBright,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        ...shadows.button,
    },
    buttonTitle: {
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    buttonContainer: {
        marginTop: spacing.smPlus,
        marginBottom: 0,
    },
    errorText: {
        color: '#C026D3',
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
});
