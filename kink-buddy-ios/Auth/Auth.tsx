import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, AppState } from 'react-native';
import { supabase } from '../supabaseCiient';
import { Button, Input } from '@rneui/themed';
import { useUserContext } from './UserContext';
import { useNavigation } from '@react-navigation/native';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation();

    const { setUserId } = useUserContext();

    // Set up AppState listener once, when component mounts
    useEffect(() => {
        const appStateListener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        return () => {
            appStateListener.remove(); // Clean up listener on unmount
        };
    }, []);

    async function signInWithEmail() {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert(error.message);
        } else if (session) {
            // Store userid in context
            setUserId(session.user.id);
            navigation.navigate('Event Calendar');
        }

        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert(error.message);
        } else if (!session) {
            Alert.alert('Please check your inbox for email verification!');
        } else if (session) {
            // Store userId in context if session exists
            setUserId(session.user.id);
            navigation.navigate('Event Calendar');
        }

        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Input
                    label="Email"
                    leftIcon={{ type: 'font-awesome', name: 'envelope' }}
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize={'none'}
                />
            </View>
            <View style={styles.verticallySpaced}>
                <Input
                    label="Password"
                    leftIcon={{ type: 'font-awesome', name: 'lock' }}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Password"
                    autoCapitalize={'none'}
                />
            </View>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Button title="Sign in" disabled={loading} onPress={signInWithEmail} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Sign up" disabled={loading} onPress={signUpWithEmail} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        padding: 12,
    },
    verticallySpaced: {
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: 'stretch',
    },
    mt20: {
        marginTop: 20,
    },
});
