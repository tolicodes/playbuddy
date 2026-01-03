import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
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
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
            <LinearGradient
                colors={['#5B1FB8', '#8E2ACB', '#C04FD4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.banner}
            >
                <View style={styles.iconBadge}>
                    <FAIcon name="lock" size={12} color="#fff" />
                </View>
                <Text style={styles.text}>
                    <Text style={styles.link}>Login</Text>
                    {' '}to unlock more events and features!
                </Text>
                <FAIcon name="chevron-right" size={12} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
        </TouchableOpacity>

    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        shadowColor: '#2b145a',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 4,
    },
    iconBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        flex: 1,
    },
    link: {
        color: '#fff',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default Banner;
