import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';

const Banner = () => {
    return (
        <View style={styles.banner}>
            <Text style={styles.text}>
                Due to App Store restrictions, some events are not available on the mobile app. Please go to{' '}
                <TouchableOpacity onPress={() => Linking.openURL('https://playbuddy.me')}>
                    <Text style={styles.link}>https://playbuddy.me</Text>
                </TouchableOpacity>
                {' '}for a full list of events.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FF4D4D', // Red color
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    link: {
        color: '#fff',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default Banner;
