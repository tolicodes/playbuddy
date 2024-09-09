import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Input } from '@rneui/themed';
import { useUserContext } from './UserContext';
import { useNavigation } from '@react-navigation/native';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signInWithEmail, signUpWithEmail } = useUserContext();
    const { goBack } = useNavigation();

    const navigateBack = () => {
        goBack();
    }

    return (
        <View style={styles.container}>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Input
                    label="Email"
                    leftIcon={{ type: 'font-awesome', name: 'envelope' }}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize="none"
                />
            </View>
            <View style={styles.verticallySpaced}>
                <Input
                    label="Password"
                    leftIcon={{ type: 'font-awesome', name: 'lock' }}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                    placeholder="Password"
                    autoCapitalize="none"
                />
            </View>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Button title="Sign in" onPress={() => {
                    signInWithEmail(email, password, navigateBack)
                }} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Sign up" onPress={() =>
                    signUpWithEmail(email, password, navigateBack)
                } />
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
