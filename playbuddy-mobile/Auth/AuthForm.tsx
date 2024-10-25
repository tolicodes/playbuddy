import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Input, Tab, Text } from '@rneui/themed';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useUserContext } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../types';

// Reusable Authentication Form
const AuthForm = ({ isSignUp }: { isSignUp: boolean }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { signInWithEmail, signUpWithEmail } = useUserContext();
    const { navigate } = useNavigation<NavStack>();

    const afterSignIn = useCallback(() => {
        setIsLoading(false);
        navigate('Main Calendar');
    }, []);

    const afterSignUp = useCallback(() => {
        setIsLoading(false);
        navigate('User Profile');
    }, []);

    const handleAuth = () => {
        if (isSignUp && !name) {
            alert('Please enter your display name');
            return;
        }

        setIsLoading(true);
        if (isSignUp) {
            signUpWithEmail({ email, password, name, callback: afterSignUp });
        } else {
            signInWithEmail({ email, password, callback: afterSignIn });
        }
    };

    const onPressSupport = () => {
        Linking.openURL('mailto:toli@toli.me');
    }

    return (
        <View style={styles.formContainer}>
            <Input
                label="Email"
                labelStyle={styles.inputLabel}
                inputStyle={styles.inputText}
                leftIcon={{ type: 'font-awesome', name: 'envelope', color: 'gray' }}
                onChangeText={setEmail}
                value={email}
                placeholder="email@address.com"
                autoCapitalize="none"
            />
            <Input
                label="Password"
                labelStyle={styles.inputLabel}
                inputStyle={styles.inputText}
                leftIcon={{ type: 'font-awesome', name: 'lock', color: 'gray' }}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                placeholder="Password"
                autoCapitalize="none"
            />
            {isSignUp && (
                <Input
                    label="Display Name"
                    labelStyle={styles.inputLabel}
                    inputStyle={styles.inputText}
                    onChangeText={setName}
                    value={name}
                    placeholder="Display Name"
                    autoCapitalize="none"
                />
            )}
            <Button
                title={isSignUp ? 'Sign Up' : 'Sign In'}
                buttonStyle={styles.authButton}
                titleStyle={styles.buttonTitle}
                onPress={handleAuth}
                loading={isLoading}
            />

            <Text style={styles.forgotPassword}>
                Forgot your password? Email support (sorry, I will fix this soon):
                {' '}<Text style={styles.link} onPress={onPressSupport}>toli@toli.me</Text>
            </Text>

        </View>
    );
};

// Define the tab views (scenes)
const SignInRoute = () => <AuthForm isSignUp={false} />;
const SignUpRoute = () => <AuthForm isSignUp={true} />;

export default function AuthTabs() {
    const layout = useWindowDimensions();

    const [index, setIndex] = useState(1); // Set default to "Sign Up" by setting index to 1
    const [routes] = useState([
        { key: 'signIn', title: 'Sign In' },
        { key: 'signUp', title: 'Sign Up' },
    ]);

    const renderScene = SceneMap({
        signIn: SignInRoute,
        signUp: SignUpRoute,
    });

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={(props) => (
                <View style={styles.tabBarContainer}>
                    <Tab value={index} onChange={setIndex} indicatorStyle={styles.indicator}>
                        <Tab.Item
                            title="Sign In"
                            titleStyle={index === 0 ? styles.activeTabTitle : styles.inactiveTabTitle}
                        />
                        <Tab.Item
                            title="Sign Up"
                            titleStyle={index === 1 ? styles.activeTabTitle : styles.inactiveTabTitle}
                        />
                    </Tab>
                </View>
            )}
        />
    );
}

// Styles
const styles = StyleSheet.create({
    formContainer: {
        padding: 20,
        backgroundColor: '#fff',
    },
    inputLabel: {
        fontSize: 16,
        color: '#333',
    },
    inputText: {
        fontSize: 16,
        color: '#000',
    },
    authButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    tabBarContainer: {
        backgroundColor: '#f7f7f7',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e2e2',
    },
    activeTabTitle: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    inactiveTabTitle: {
        color: '#999',
        fontWeight: 'normal',
    },
    indicator: {
        backgroundColor: '#007AFF',
        height: 3,
    },
    link: {
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
    forgotPassword: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    }
});
