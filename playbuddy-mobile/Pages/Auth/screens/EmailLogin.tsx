import React, { useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input, Button, Icon } from '@rneui/themed';
import { useUserContext } from '../hooks/UserContext';

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

    const handleSignUp = () => signUpWithEmail(email, password);
    const handleSignIn = () => signInWithEmail(email, password);

    return (
        <View style={styles.loginContainer} >
            <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                containerStyle={styles.inputContainer}
                inputStyle={styles.inputText}
                placeholderTextColor="#A9A9A9"
                errorStyle={styles.errorText}
                leftIcon={{ type: 'font-awesome', name: 'envelope', color: '#007AFF' }}
                autoCapitalize='none'
            />
            <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                containerStyle={styles.inputContainer}
                inputStyle={styles.inputText}
                placeholderTextColor="#A9A9A9"
                errorStyle={styles.errorText}
                leftIcon={{ type: 'font-awesome', name: 'lock', color: '#007AFF' }}
                autoCapitalize='none'
            />
            {isSignUp && (
                <Input
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    secureTextEntry
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.inputText}
                    placeholderTextColor="#A9A9A9"
                    errorStyle={styles.errorText}
                    leftIcon={{ type: 'font-awesome', name: 'lock', color: '#007AFF' }}
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
    const { signUpWithEmail, signInWithEmail } = useUserContext();

    return (
        <View style={styles.emailContainer}>
            <Text style={styles.header}>Email Login</Text>
            <Tab.Navigator style={styles.tabNavigator}  >
                <Tab.Screen name="Sign Up">
                    {() => <Login
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        isSignUp={true}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                        handleSignUp={signUpWithEmail}
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
                        handleSignIn={signInWithEmail}
                    />}
                </Tab.Screen>

            </Tab.Navigator>
            <TouchableOpacity onPress={onSwitchToPhone}>
                <Text style={styles.switchText}>Login with Phone</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    emailContainer: {
        padding: 20,
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 10,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    loginContainer: {
        flex: 1,
        backgroundColor: 'white',
        paddingTop: 20,
    },
    tabNavigator: {
        flex: 1,
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
        marginTop: 10,
        marginBottom: 0,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
    },
});