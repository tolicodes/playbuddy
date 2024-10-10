import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useUserContext } from './UserContext';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from './Avatar';

export default function AccountDetails() {
    const { userProfile, signOut } = useUserContext();
    const { goBack } = useNavigation();

    const onPressSignOut = async () => {
        signOut(goBack);
    }

    const onPressHome = () => {
        goBack();
    }

    const onPressDeleteAccount = async () => {
        Alert.alert(
            'Are you suuure?',
            'Are you SURE you want to delete your account? This will also delete all your wishlists 😢',
            [
                {
                    text: 'DELETE',
                    onPress: () => { signOut(goBack); },
                    style: 'destructive',
                },
                {
                    text: 'Cancel',
                    onPress: () => { },
                    style: 'cancel',
                },
            ],
            {
                cancelable: true,
                onDismiss: () =>
                    Alert.alert(
                        'This alert was dismissed by tapping outside of the alert dialog.',
                    ),
            },
        );
    };

    const onPressSupport = () => {
        Linking.openURL('mailto:toli@toli.me');
    }


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Account Details</Text>

            <Avatar />

            <View style={styles.infoContainer}>
                <Text style={styles.label}>Logged in as:</Text>
                <Text style={styles.value}>{userProfile?.email}</Text>

                <Text style={styles.label}>Display Name:</Text>
                <Text style={styles.value}>{userProfile?.name}</Text>

                <Text style={styles.label}>Wishlist Share Code:</Text>
                <Text style={styles.value}>{userProfile?.share_code}</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={onPressHome}>
                <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={onPressSignOut}>
                <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.deleteAccountButton]} onPress={onPressDeleteAccount}>
                <Text style={styles.buttonText}>DANGER: Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onPressSupport}>
                <Text style={styles.getSupport}>Get support or suggest stuff by emailing me directly: toli@toli.me.</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f9f9f9',
    },
    headerText: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 20,
    },
    infoContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#888',
    },
    value: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginBottom: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    signOutButton: {
        backgroundColor: '#FF3B30',
    },
    deleteAccountButton: {
        backgroundColor: 'red'
    },
    getSupport: {
        color: 'blue',
        textAlign: 'center'
    }
});
