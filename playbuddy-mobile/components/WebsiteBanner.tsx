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
import { colors, fontFamilies, fontSizes, gradients, radius, shadows, spacing } from './styles';
import { navigateToAuth } from '../Common/Nav/navigationHelpers';
const Banner = () => {
    const navigation = useNavigation<NavStack>()
    const { authUserId } = useUserContext();
    const analyticsProps = useAnalyticsProps();

    const isLoggedIn = !!authUserId;

    const handlePress = () => {
        logEvent(UE.LoginBannerClicked, analyticsProps);
        navigateToAuth(navigation, isLoggedIn ? 'Profile' : 'Login Form');
    };
    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
            <LinearGradient
                colors={[colors.surfaceWhiteOpaque, colors.surfaceLavenderOpaque]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.banner}
            >
                <View style={styles.iconBadge}>
                    <FAIcon name="lock" size={12} color={colors.brandPurpleDark} />
                </View>
                <Text style={styles.text}>
                    <Text style={styles.link}>Login</Text>
                    {' '}to unlock more events and features!
                </Text>
                <FAIcon name="chevron-right" size={12} color={colors.brandInk} />
            </LinearGradient>
        </TouchableOpacity>

    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: spacing.mdPlus,
        paddingBottom: spacing.smPlus,
        paddingHorizontal: spacing.mdPlus,
        borderRadius: radius.lg,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        ...shadows.card,
    },
    iconBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.badgeBackground,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.smPlus,
    },
    text: {
        color: colors.brandText,
        fontSize: fontSizes.xl,
        flex: 1,
        fontFamily: fontFamilies.body,
    },
    link: {
        color: colors.brandPurpleDark,
        fontWeight: '700',
        textDecorationLine: 'underline',
        fontFamily: fontFamilies.body,
    },
});

export default Banner;
