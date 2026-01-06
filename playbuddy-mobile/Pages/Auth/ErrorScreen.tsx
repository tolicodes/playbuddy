import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { colors, fontFamilies, fontSizes, spacing } from '../../components/styles';

const ErrorScreen = () => {
    const handleEmailPress = () => {
        Linking.openURL('mailto:toli@toli.me');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <FontAwesome name="exclamation-triangle" size={100} color={colors.danger} />
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
        backgroundColor: colors.white,
    },
    content: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    title: {
        fontSize: fontSizes.headline,
        fontWeight: '700',
        marginVertical: spacing.xl,
        textAlign: 'center',
        color: colors.textDeep,
        fontFamily: fontFamilies.display,
    },
    message: {
        fontSize: fontSizes.xl,
        textAlign: 'center',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    email: {
        color: colors.linkBlue,
        textDecorationLine: 'underline',
        fontFamily: fontFamilies.body,
    },
});

export default ErrorScreen;
