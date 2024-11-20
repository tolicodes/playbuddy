import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Banner = () => {
    return (
        <View style={styles.banner}>
            <Text style={styles.text}>
                This is a demo functionality (Coming Soon)
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
});

export default Banner;
