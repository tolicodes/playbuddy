import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input, Button, Icon } from '@rneui/themed';
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
            <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                inputContainerStyle={styles.inputInner}
                inputStyle={styles.inputText}
                leftIcon={<Icon name='phone' type='font-awesome' color={colors.brandBright} size={16} />}
                placeholderTextColor="#9C8FB3"
                errorStyle={styles.errorText}
            />
            {otpSent && (
                <Input
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                    containerStyle={styles.inputContainer}
                    inputContainerStyle={styles.inputInner}
                    inputStyle={styles.inputText}
                    placeholderTextColor="#9C8FB3"
                    errorStyle={styles.errorText}
                />
            )}
            <Button
                title={otpSent ? "Sign In" : "Send Verification Code"}
                onPress={otpSent ? handleLogin : handleSendOtp}
                buttonStyle={styles.button}
                titleStyle={styles.buttonTitle}
                containerStyle={styles.buttonContainer}
            />
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
        borderColor: 'rgba(107,70,193,0.12)',
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
    },
    inputText: {
        fontSize: fontSizes.lg,
        color: colors.brandText,
        fontFamily: fontFamilies.body,
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
        marginVertical: spacing.smPlus,
    },
    errorText: {
        color: '#C026D3',
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
});
