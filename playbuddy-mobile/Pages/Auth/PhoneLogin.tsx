import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useUserContext } from './hooks/UserContext';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

export const PhoneLogin: React.FC<{ onSwitchToEmail: () => void; }> = ({ onSwitchToEmail }) => {
    const [phone, setPhone] = useState<string>('+1');
    const [otpSent, setOtpSent] = useState<boolean>(false);
    const [otp, setOtp] = useState<string>('');
    const { phoneSendOtp, phoneVerifyOtp } = useUserContext();
    const analyticsProps = useAnalyticsProps();

    const handleSendOtp = () => {
        logEvent(UE.LoginFormPressLoginWithPhoneSendOTP, analyticsProps);
        phoneSendOtp({ phone });
        setOtpSent(true);
    };

    const handleLogin = () => {
        try {
            phoneVerifyOtp({ phone, otp });
            logEvent(UE.LoginFormPressLoginWithPhone, analyticsProps);
        } catch (error) {
            alert('Invalid Verification Code');
            throw new Error(`Invalid OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <View style={styles.phoneContainer}>
            <View style={styles.headerRow}>
                <View style={styles.headerBadge}>
                    <FAIcon name="phone-alt" size={14} color={colors.brandBright} />
                </View>
                <Text style={styles.header}>Phone</Text>
            </View>
            <View style={styles.inputContainer}>
                <View style={styles.inputInner}>
                    <FAIcon name="phone" size={16} color={colors.brandBright} style={styles.leftIcon} />
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Enter phone number"
                        placeholderTextColor={colors.brandTextMuted}
                        keyboardType="phone-pad"
                        style={styles.inputText}
                    />
                </View>
            </View>
            {otpSent && (
                <View style={styles.inputContainer}>
                    <View style={styles.inputInner}>
                        <TextInput
                            value={otp}
                            onChangeText={setOtp}
                            placeholder="Enter verification code"
                            placeholderTextColor={colors.brandTextMuted}
                            keyboardType="number-pad"
                            style={styles.inputText}
                        />
                    </View>
                </View>
            )}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={otpSent ? handleLogin : handleSendOtp}
                    activeOpacity={0.85}
                >
                    <Text style={styles.buttonTitle}>{otpSent ? "Sign In" : "Send Verification Code"}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onSwitchToEmail}>
                <Text style={styles.switchText}>Use email instead</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    phoneContainer: {
        padding: spacing.xl,
        backgroundColor: colors.white,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.badgeBackground,
        justifyContent: 'center',
        ...shadows.brandCard,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: spacing.mdPlus,
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
        marginVertical: spacing.smPlus,
    },
    errorText: {
        color: colors.danger,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
});
