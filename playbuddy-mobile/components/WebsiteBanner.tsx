import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavStack } from '../Common/Nav/NavStackType';
import { logEvent } from '../Common/hooks/logger';
import { useUserContext } from '../Pages/Auth/hooks/UserContext';
import { UE } from '../userEventTypes';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
const Banner = () => {
    const navigation = useNavigation<NavStack>()
    const { authUserId } = useUserContext();
    const analyticsProps = useAnalyticsProps();

    const isLoggedIn = !!authUserId;

    const handlePress = () => {
        logEvent(UE.LoginBannerClicked, analyticsProps);
        navigation.navigate('AuthNav', { screen: isLoggedIn ? 'Profile' : 'Login Form' });
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
