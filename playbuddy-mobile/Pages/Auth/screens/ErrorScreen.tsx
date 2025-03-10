import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const ErrorScreen = () => {
    const handleEmailPress = () => {
        Linking.openURL('mailto:toli@toli.me');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <FontAwesome name="exclamation-triangle" size={100} color="red" />
                <Text style={styles.title}>App is failing to load.</Text>
                <Text style={styles.message}>
                    This may be temporary...or a real problem :/ {'\n'}
                    Either way contact <Text style={styles.email} onPress={handleEmailPress}>toli@toli.me</Text> and tell him what's going on!
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    content: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 20,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#333',
    },
    email: {
        color: 'blue',
        textDecorationLine: 'underline',
    },
});

export default ErrorScreen;
