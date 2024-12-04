import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button } from '@rneui/themed';
import { useUserContext } from '../hooks/UserContext';
import { EmailLogin } from './EmailLogin';
import { PhoneLogin } from './PhoneLogin';

const GoogleLogin: React.FC = () => {
    const { authenticateWithGoogle } = useUserContext();
    return (
        <View style={styles.googleContainer}>
            <Button
                title="Sign in with Google"
                onPress={authenticateWithGoogle}
                buttonStyle={styles.googleButton}
                titleStyle={styles.buttonTitle}
                containerStyle={styles.buttonContainer}
            />
        </View>
    );
};

const AuthFormScreen: React.FC = () => {
    const [showEmailLogin, setShowEmailLogin] = useState<boolean>(false);

    return (
        <View style={styles.authContainer}>
            {showEmailLogin
                ? <EmailLogin onSwitchToPhone={() => setShowEmailLogin(false)} />
                : <PhoneLogin onSwitchToEmail={() => setShowEmailLogin(true)} />
            }
            <View style={styles.orContainer}>
                <Text style={styles.orText}>or continue with</Text>
            </View>
            <GoogleLogin />
        </View>
    );
}

const styles = StyleSheet.create({
    authContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    orContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    orText: {
        textAlign: 'center',
    },
    googleContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
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
        fontWeight: '600',
    },
});

export default AuthFormScreen;
