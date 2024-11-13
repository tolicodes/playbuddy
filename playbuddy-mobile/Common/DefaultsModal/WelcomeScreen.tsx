import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderLoginButton from '../../Auth/HeaderLoginButton';
import { useNavigation } from '@react-navigation/native';

const features = [
    { id: '1', title: 'My Calendar', description: 'Add events to plan your week', icon: 'calendar' },
    { id: '2', title: 'Buddies', description: 'Share your calendar & coordinate plans', icon: 'people' },
    { id: '3', title: 'Communities', description: 'Join groups with private events', icon: 'chatbubbles' },
    { id: '4', title: 'Swipe Mode', description: 'Swipe through events to plan your week', icon: 'heart' },
    { id: '5', title: 'Personalization', description: 'Set your home location and community', icon: 'location' }
];

export const WelcomeScreen = ({ onClose: onClose }: { onClose: () => void }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.welcomeTitle}>Welcome to PlayBuddy!</Text>
            <Text style={styles.suggestionText}>
                Creating an account unlocks <Text style={styles.highlightedText}>5x more events</Text> and features:
            </Text>

            <View style={styles.loginButtonContainer}>
                <HeaderLoginButton size={50} showLoginText={true} register={true} onPressButton={onClose} />
            </View>

            <FlatList
                data={features}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.featureItem}>
                        <Ionicons name={item.icon as any} size={24} color="#007AFF" style={styles.featureIcon} />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>{item.title}</Text>
                            <Text style={styles.featureDescription}>{item.description}</Text>
                        </View>
                    </View>
                )}
            />

            <TouchableOpacity style={styles.noThanksButton} onPress={onClose}>
                <Text style={styles.noThanksText}>Skip for now</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        width: '90%'
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20
    },
    suggestionText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    highlightedText: {
        fontWeight: 'bold',
        color: '#007AFF'
    },
    loginButtonContainer: {
        marginVertical: 20
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    featureIcon: {
        marginRight: 10
    },
    featureTextContainer: {
        flex: 1
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    featureDescription: {
        fontSize: 14,
        color: '#666'
    },
    noThanksButton: {
        marginTop: 20,
        paddingVertical: 10,
        alignItems: 'center',
        color: '#666'
    },
    noThanksText: {
        fontSize: 16,
        color: '#333'
    }
});
