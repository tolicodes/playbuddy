import React, { useState } from "react";
import axios from 'axios';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput, Switch } from "react-native";
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
    const { mutateAsync: updateUserProfile } = useUpdateUserProfile(authUserId || '')
    const [name, setName] = useState<string>(
        userProfile?.name
        // for google
        || session?.user?.user_metadata?.full_name
        || ''
    );
    const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(true);

    const analyticsProps = useAnalyticsProps();
    const isEditing = !!userProfile?.name;
    const showNewsletterOptIn = !isEditing;

    const onPressCreateAccount = async () => {
        const normalizedName = name.trim();
        if (!normalizedName) {
            Alert.alert('Please enter a name');
            return;
        }

        logEvent(UE.AccountProfileDetailsFormPressSave, analyticsProps);

        if (!isEditing && currentDeepLink?.id) {
            logEvent(UE.ProfileInitialDeepLinkAssigned, {
                ...analyticsProps,
                initial_deep_link_id: currentDeepLink.id,
            });
        }

        try {
            const updatePayload: {
                name: string;
                avatar_url?: string;
                initial_deep_link_id?: string;
                joined_newsletter?: boolean;
            } = {
                name: normalizedName,
                avatar_url: userProfile?.avatar_url,
                initial_deep_link_id: !isEditing ? currentDeepLink?.id || undefined : undefined,
            };
            if (showNewsletterOptIn) {
                updatePayload.joined_newsletter = subscribeToNewsletter;
            }
            await updateUserProfile(updatePayload);
            if (isEditing) {
                navigation.goBack();
            }
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error || error.message
                : error instanceof Error
                    ? error.message
                    : 'Something went wrong.';
            const title = axios.isAxiosError(error) && error.response?.status === 409
                ? 'Display name unavailable'
                : 'Unable to save profile';
            Alert.alert(title, errorMessage);
        }
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
                    <Text style={styles.headerText}>{isEditing ? 'Update Your Display Name' : 'Create Your Account'}</Text>
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

                    {showNewsletterOptIn && (
                        <View style={styles.newsletterRow}>
                            <View style={styles.newsletterCopy}>
                                <Text style={styles.newsletterLabel}>Subscribe to the newsletter</Text>
                                <Text style={styles.newsletterDescription}>
                                    Weekly event drops and community tips in your inbox.
                                </Text>
                            </View>
                            <Switch
                                value={subscribeToNewsletter}
                                onValueChange={setSubscribeToNewsletter}
                                trackColor={{ false: colors.borderMutedAlt, true: colors.brandIndigo }}
                                thumbColor={colors.white}
                                ios_backgroundColor={colors.borderMutedAlt}
                            />
                        </View>
                    )}

                    <TouchableOpacity style={styles.button} onPress={onPressCreateAccount}>
                        <Text style={styles.buttonText}>{isEditing ? 'Save Changes' : 'Create Account'}</Text>
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
    newsletterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        alignSelf: 'stretch',
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.sm,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        marginBottom: spacing.xl,
        ...shadows.card,
    },
    newsletterCopy: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    newsletterLabel: {
        color: colors.textDeep,
        fontSize: fontSizes.lg,
        fontWeight: '600',
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    newsletterDescription: {
        color: colors.brandTextMuted,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
    },
});
