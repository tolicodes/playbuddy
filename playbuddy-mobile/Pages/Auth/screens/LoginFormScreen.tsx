import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button } from '@rneui/themed';
import { useUserContext } from '../hooks/UserContext';
import { EmailLogin } from './EmailLogin';
import { PhoneLogin } from './PhoneLogin';

const GoogleLogin: React.FC = () => {
    const { authenticateWithGoogle } = useUserContext();
    return (
        <Button
            title="Sign in with Google"
            onPress={authenticateWithGoogle}
            buttonStyle={styles.googleButton}
            titleStyle={styles.buttonTitle}
            containerStyle={styles.buttonContainer}
        />
    );
};

const AppleLogin: React.FC = () => {
    const { authenticateWithApple } = useUserContext();
    return (
        <Button
            title="Sign in with Apple"
            onPress={authenticateWithApple}
            buttonStyle={styles.appleButton}
            titleStyle={styles.buttonTitle}
            containerStyle={styles.buttonContainer}
        />
    );
};

const LoginFormScreen: React.FC = () => {
    const [showEmailLogin, setShowEmailLogin] = useState<boolean>(true);

    return (
        <View style={styles.authContainer}>
            {showEmailLogin
                ? <EmailLogin onSwitchToPhone={() => setShowEmailLogin(false)} />
                : <PhoneLogin onSwitchToEmail={() => setShowEmailLogin(true)} />
            }
            <View style={styles.orContainer}>
                <Text style={styles.orText}>or continue with</Text>
            </View>

            <View style={styles.ssoContainer}>
                <GoogleLogin />
                <AppleLogin />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    authContainer: {
        flex: .9,
        justifyContent: 'center',
    },
    orContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    orText: {
        textAlign: 'center',
    },
    ssoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },

    appleButton: {
        backgroundColor: 'black',
        borderRadius: 10,
        paddingVertical: 12,
        marginLeft: 10,
    },
    buttonContainer: {
        marginVertical: 10,
    },
    googleButton: {
        backgroundColor: '#DB4437',
        borderRadius: 10,
        paddingVertical: 12,
    },
    buttonTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default LoginFormScreen;
