import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useUserContext } from './hooks/UserContext';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

interface LoginProps {
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    isSignUp: boolean;
    confirmPassword?: string;
    setConfirmPassword?: (confirmPassword: string) => void;
}

type AuthTab = 'signup' | 'login';

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
            <View style={styles.inputContainer}>
                <View style={styles.inputInner}>
                    <FAIcon name="envelope" size={16} color={colors.brandBright} style={styles.leftIcon} />
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter email"
                        placeholderTextColor={colors.brandTextMuted}
                        style={styles.inputText}
                        autoCapitalize="none"
                    />
                </View>
            </View>
            <View style={styles.inputContainer}>
                <View style={styles.inputInner}>
                    <FAIcon name="lock" size={16} color={colors.brandBright} style={styles.leftIcon} />
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
                        placeholderTextColor={colors.brandTextMuted}
                        secureTextEntry
                        style={styles.inputText}
                        autoCapitalize="none"
                    />
                </View>
            </View>
            {isSignUp && (
                <View style={styles.inputContainer}>
                    <View style={styles.inputInner}>
                        <FAIcon name="lock" size={16} color={colors.brandBright} style={styles.leftIcon} />
                        <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Re-enter password"
                            placeholderTextColor={colors.brandTextMuted}
                            secureTextEntry
                            style={styles.inputText}
                            autoCapitalize="none"
                        />
                    </View>
                </View>
            )}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={isSignUp ? handleSignUp : handleSignIn}
                    activeOpacity={0.85}
                >
                    <Text style={styles.buttonTitle}>{isSignUp ? "Sign Up" : "Sign In"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export const EmailLogin: React.FC<{ onSwitchToPhone: () => void; }> = ({ onSwitchToPhone }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [activeTab, setActiveTab] = useState<AuthTab>('signup');

    const tabs = [
        { label: 'Sign Up', value: 'signup' as const },
        { label: 'Sign In', value: 'login' as const },
    ];

    return (
        <View style={styles.emailContainer}>
            <View style={styles.headerRow}>
                <View style={styles.headerBadge}>
                    <FAIcon name="envelope" size={14} color={colors.brandBright} />
                </View>
                <Text style={styles.header}>Email</Text>
            </View>
            <View style={styles.segmentedWrap}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                        <TouchableOpacity
                            key={tab.value}
                            onPress={() => setActiveTab(tab.value)}
                            style={[
                                styles.segmentedButton,
                                isActive && styles.segmentedButtonActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={isActive ? styles.segmentedTextActive : styles.segmentedText}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={styles.formContainer}>
                <Login
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    isSignUp={activeTab === 'signup'}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                />
            </View>
            <TouchableOpacity onPress={onSwitchToPhone}>
                <Text style={styles.switchText}>Use phone instead</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    emailContainer: {
        paddingTop: spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: 0,
        backgroundColor: colors.white,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.badgeBackground,
        justifyContent: 'center',
        ...shadows.brandCard,
    },
    loginContainer: {
        paddingTop: spacing.mdPlus,
    },
    segmentedWrap: {
        flexDirection: 'row',
        alignSelf: 'center',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSoft,
        borderWidth: 1,
        borderColor: colors.badgeBackground,
        marginBottom: spacing.smPlus,
    },
    segmentedButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
    },
    segmentedButtonActive: {
        backgroundColor: colors.accentPurple,
        shadowColor: colors.black,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    segmentedText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    segmentedTextActive: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    formContainer: {
        minHeight: 300,
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
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputText: {
        fontSize: fontSizes.lg,
        color: colors.brandText,
        fontFamily: fontFamilies.body,
        flex: 1,
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
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.button,
    },
    buttonTitle: {
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.lg,
        color: colors.white,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: spacing.smPlus,
        marginBottom: 0,
    },
    errorText: {
        color: colors.danger,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
});
