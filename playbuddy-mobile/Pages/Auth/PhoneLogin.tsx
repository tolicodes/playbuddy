import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input, Button, Icon } from '@rneui/themed';
import { useUserContext } from './hooks/UserContext';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';

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
            <Text style={styles.header}>Phone Login</Text>
            <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                inputStyle={styles.inputText}
                leftIcon={<Icon name='phone' type='font-awesome' color='#007AFF' />}
                placeholderTextColor="#A9A9A9"
                errorStyle={styles.errorText}
            />
            {otpSent && (
                <Input
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.inputText}
                    placeholderTextColor="#A9A9A9"
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
                <Text style={styles.switchText}>Login with Email</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    phoneContainer: {
        padding: 20,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#007AFF',
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputText: {
        fontSize: 16,
        color: '#000',
    },
    switchText: {
        marginTop: 10,
        color: '#007AFF',
        textAlign: 'center',
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 12,
    },
    buttonTitle: {
        fontWeight: '600',
    },
    buttonContainer: {
        marginVertical: 10,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
    },
});