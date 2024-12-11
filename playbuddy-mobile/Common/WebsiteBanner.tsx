import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavStack } from './Nav/NavStackType';
import { logEvent } from './hooks/logger';

const Banner = () => {
    const navigation = useNavigation<NavStack>()
    const handlePress = () => {
        logEvent('login_banner_clicked');
        navigation.navigate('Auth');
    };
    return (
        <TouchableOpacity onPress={handlePress}>
            <View style={styles.banner}>

                <Text style={styles.text}>

                    <Text style={styles.link}>Login</Text>
                    {' '}to unlock more events and features!
                </Text>
            </View>
        </TouchableOpacity>

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
