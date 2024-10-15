// screens/BuddyScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';

export default function BuddyAddedConfirmation({ buddy, onAddAnotherBuddy }: { buddy: any, onAddAnotherBuddy: () => void }) {
    return (
        <View style={styles.container}>
            <Text style={styles.heading}>You are now friends with</Text>
            <Text style={styles.buddyName}>{buddy.displayName}</Text>
            <Image source={{ uri: buddy.avatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.button} onPress={() => onAddAnotherBuddy()}>
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
        backgroundColor: '#f8f8f8',
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
