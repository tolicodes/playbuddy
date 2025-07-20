// screens/BuddyScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image'
import { logEvent } from '../../../../Common/hooks/logger';
export default function BuddyAddedConfirmation({ buddy, onAddAnotherBuddy }: { buddy: any, onAddAnotherBuddy: () => void }) {
    return (
        <View style={styles.container}>
            <Text style={styles.heading}>You are now friends with</Text>
            <Text style={styles.buddyName}>{buddy.name}</Text>
            <Image source={{ uri: buddy.avatar_url }} style={styles.avatar} />
            <TouchableOpacity style={styles.button} onPress={() => {
                onAddAnotherBuddy();
                logEvent('add_buddy_confirmation_press_add_another_buddy');
            }}>
                <Text style={styles.buttonText}>Add Another Buddy?</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 20,
        marginBottom: 10,
    },
    buddyName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 20,
        borderRadius: 10,
    },
    buttonText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
    },
});
