import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { Input, Button } from '@rneui/themed';
import { TabView, SceneMap } from 'react-native-tab-view';

import {
    GoogleOneTapSignIn,
    statusCodes,
    type OneTapUser,
} from '@react-native-google-signin/google-signin';


GoogleOneTapSignIn.configure({
    webClientId: 'autoDetect',
});

interface PhoneLoginProps {
    onSwitchToEmail: () => void; // Added missing prop
    onLoggedIn: () => void;
}

const PhoneLogin: React.FC<PhoneLoginProps> = ({ onSwitchToEmail, onLoggedIn }) => {
    const [phone, setPhone] = useState<string>('');
    const [otpSent, setOtpSent] = useState<boolean>(false);
    const [otp, setOtp] = useState<string>('');

    const handleSendOtp = () => {
        setOtpSent(true); // Simulate OTP sent
    };

    const handleLogin = () => {
        onLoggedIn();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Sign Up/Sign In</Text>
            <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                inputStyle={styles.inputText}
            />
            {otpSent && (
                <Input
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.inputText}
                />
            )}
            <Button
                title={otpSent ? "Sign In" : "Send Verification Code"}
                onPress={otpSent ? handleLogin : handleSendOtp}
                buttonStyle={styles.button}
                titleStyle={styles.buttonTitle}
            />
            <TouchableOpacity onPress={onSwitchToEmail}>
                <Text style={styles.switchText}>Login with Email</Text>
            </TouchableOpacity>
        </View>
    );
};

interface EmailLoginProps {
    onSwitchToPhone: () => void;
    onLoggedIn: () => void;
}

const EmailLogin: React.FC<EmailLoginProps> = ({ onSwitchToPhone, onLoggedIn }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [isSignUp, setIsSignUp] = useState<boolean>(false);

    const handleToggleMode = () => setIsSignUp(!isSignUp);

    const handleLogin = () => {
        onLoggedIn();
    };

    return (
        <View style={styles.container}>
            <TabView
                renderScene={SceneMap({
                    login: () => (
                        <>
                            <Input
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter email"
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.inputText}
                            />
                            <Input
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter password"
                                secureTextEntry
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.inputText}
                            />
                            {isSignUp && (
                                <Input
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter password"
                                    secureTextEntry
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.inputText}
                                />
                            )}
                            <Button title={isSignUp ? "Sign Up" : "Sign In"} onPress={handleLogin} buttonStyle={styles.button} titleStyle={styles.buttonTitle} />
                        </>
                    ),
                })}
                navigationState={{
                    index: isSignUp ? 1 : 0,
                    routes: [
                        { key: 'login', title: 'Sign In' },
                        { key: 'signup', title: 'Sign Up' },
                    ],
                }}
                onIndexChange={handleToggleMode}
            />
            <TouchableOpacity onPress={onSwitchToPhone}>
                <Text style={styles.switchText}>Login with Phone</Text>
            </TouchableOpacity>
        </View>
    );
};

interface GoogleLoginProps {
    onLoggedIn: () => void;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onLoggedIn }) => {
    const handleGoogleLogin = () => {
        onLoggedIn();
    };

    return (
        <View style={styles.container}>
            <Image source={{ uri: 'https://developers.google.com/static/identity/images/branding_guideline_sample_lt_rd_lg.svg' }} style={styles.googleIcon} />
            {/* <Button title="Sign in with Google" onPress={handleGoogleLogin} buttonStyle={[styles.button, styles.googleButton]} titleStyle={styles.buttonTitle} /> */}
        </View>
    );
};

interface OnboardingProps {
    onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [displayName, setDisplayName] = useState<string>('');
    const [avatar, setAvatar] = useState<string | null>(null);

    const handleAvatarUpload = () => {
        // Simulate avatar upload
        setAvatar('https://via.placeholder.com/150');
    };

    const handleContinue = () => {
        onComplete();
    };

    return (
        <View style={styles.container}>
            <Input
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter display name"
                containerStyle={styles.inputContainer}
                inputStyle={styles.inputText}
            />
            <TouchableOpacity onPress={handleAvatarUpload}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <Text style={styles.uploadText}>Upload Avatar</Text>
                )}
            </TouchableOpacity>
            <Button title="Continue" onPress={handleContinue} buttonStyle={styles.button} titleStyle={styles.buttonTitle} />
        </View>
    );
};

const AuthScreen: React.FC = () => {
    const [showEmailLogin, setShowEmailLogin] = useState<boolean>(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);

    if (!isLoggedIn) {
        return showEmailLogin ? (
            <EmailLogin onSwitchToPhone={() => setShowEmailLogin(false)} onLoggedIn={() => setIsLoggedIn(true)} />
        ) : (
            <View style={{ flex: 1 }}>
                <PhoneLogin onSwitchToEmail={() => setShowEmailLogin(true)} onLoggedIn={() => setIsLoggedIn(true)} />
                <GoogleLogin onLoggedIn={() => setIsLoggedIn(true)} />
            </View>
        );
    }

    if (!onboardingComplete) {
        return <Onboarding onComplete={() => setOnboardingComplete(true)} />;
    }

    return <Text style={styles.successText}>Welcome to the app!</Text>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
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
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignSelf: 'center',
        marginVertical: 20,
    },
    uploadText: {
        color: '#007AFF',
        textAlign: 'center',
        marginVertical: 20,
    },
    successText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 18,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 12,
    },
    buttonTitle: {
        fontWeight: '600',
    },
    googleButton: {
        backgroundColor: '#DB4437',
    },
});
export default AuthScreen;
