import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
});
