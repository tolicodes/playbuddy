import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserContext } from "./hooks/UserContext";
import { Avatar } from './Buttons/Avatar';
import { logEvent } from '../../Common/hooks/logger';
import { useUpdateUserProfile } from "./hooks/useUserProfile";
import { signOut } from "./hooks/authUtils";
import { useNavigation } from "@react-navigation/native";
import { NavStack } from "../../Common/Nav/NavStackType";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../../Common/hooks/useAnalytics";
import { navigateToTab } from "../../Common/Nav/navigationHelpers";
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

export const ProfileDetailsForm = () => {
    const { authUserId, userProfile, isLoadingUserProfile, session, currentDeepLink } = useUserContext()
    const { mutate: updateUserProfile } = useUpdateUserProfile(authUserId || '')
    const [name, setName] = useState<string>(
        userProfile?.name
        // for google
        || session?.user?.user_metadata?.full_name
        || ''
    );

    const analyticsProps = useAnalyticsProps();

    const onPressCreateAccount = () => {
        if (!name) {
            Alert.alert('Please enter a name');
            return;
        }

        logEvent(UE.AccountProfileDetailsFormPressSave, analyticsProps);

        if (currentDeepLink?.id) {
            logEvent(UE.ProfileInitialDeepLinkAssigned, {
                ...analyticsProps,
                initial_deep_link_id: currentDeepLink.id,
            });
        }

        updateUserProfile({
            name, avatar_url: userProfile?.avatar_url,
            initial_deep_link_id: currentDeepLink?.id || undefined,
        });
    }
    const navigation = useNavigation<NavStack>();

    const onPressSignOut = async () => {
        logEvent(UE.AccountProfileDetailsFormPressSignOut, analyticsProps);
        signOut();
        navigateToTab(navigation, 'Calendar');
    }


    if (isLoadingUserProfile) {
        return <ActivityIndicator color={colors.brandIndigo} />
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.centeredContent}>
                    <Text style={styles.headerText}>Create Your Account</Text>
                    <Text style={styles.subHeaderText}>This is how your buddies will identify you</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Display Name</Text>
                        <TextInput
                            style={styles.inputText}
                            onChangeText={setName}
                            value={name}
                            placeholder="Your Display Name"
                            placeholderTextColor={colors.brandTextMuted}
                        />
                    </View>

                    <View style={{ marginVertical: 20 }}>
                        <Avatar name={name} />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={onPressCreateAccount}>
                        <Text style={styles.buttonText}>Create Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={onPressSignOut}>
                        <Text style={styles.buttonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceSubtle,
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    centeredContent: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.jumbo,
    },
    headerText: {
        fontSize: fontSizes.displayLg,
        fontWeight: '700',
        marginBottom: spacing.xl,
        color: colors.brandText,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
    },
    subHeaderText: {
        fontSize: fontSizes.xxl,
        marginBottom: spacing.jumbo * 2 + spacing.xl,
        color: colors.brandTextMuted,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    button: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.smPlus,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
        width: '100%',
    },
    buttonText: {
        color: colors.white,
        fontSize: fontSizes.xxl,
        fontWeight: '600',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    signOutButton: {
        backgroundColor: colors.danger,
    },
    inputLabel: {
        color: colors.textDeep,
        textAlign: 'center',
        fontWeight: '500',
        fontSize: fontSizes.xxxl,
        marginBottom: spacing.smPlus,
        // display: 'none',
        fontFamily: fontFamilies.body,
    },
    inputContainer: {
        alignSelf: 'stretch',
        marginBottom: spacing.xl,
    },
    inputText: {
        color: colors.textDeep,
        borderColor: colors.borderAccent,
        borderWidth: 2,
        borderRadius: radius.sm,
        padding: spacing.md,
        backgroundColor: colors.white,
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
        ...shadows.card,
        width: '100%',
    },
});
