import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BuddyListsScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Buddy Lists</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>

            <Ionicons name="construct-outline" size={150} color="#007AFF" style={styles.icon} />

            <Text style={styles.description}>
                Craft your buddy lists and match them with perfect events, from polycule snuggles to bondage fun!
            </Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F9F9FB', // iOS light background color
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1C1C1E', // iOS dark text color
        textAlign: 'center',
        marginBottom: 20,
    },
    comingSoon: {
        fontSize: 28,
        fontWeight: '600',
        color: '#007AFF', // iOS blue color
        textAlign: 'center',
        marginBottom: 20,
    },
    icon: {
        marginBottom: 30,
    },
    description: {
        fontSize: 18,
        textAlign: 'center',
        color: '#3A3A3C',
        marginHorizontal: 20,
    },
});

export default BuddyListsScreen;
