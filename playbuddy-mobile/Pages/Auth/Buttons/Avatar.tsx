import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUserContext } from '../hooks/UserContext';
import { useUploadAvatar } from '../hooks/useUserProfile';
import { logEvent } from '../../../Common/hooks/logger';
import { AvatarCircle } from './AvatarCircle';
import { UE } from '../../../Common/types/userEventTypes';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { colors, fontFamilies, fontSizes, spacing } from '../../../components/styles';

const AVATAR_SIZE = 150;

export const Avatar = ({ name }: { name?: string }) => {
    const { authUserId, userProfile, session } = useUserContext();

    const analyticsProps = useAnalyticsProps();

    const [uploadImageUri, setUploadImageUri] = useState<string | null>(
        session?.user?.user_metadata?.avatar_url || null
    );

    const [uploading, setUploading] = useState(false);
    const [awaitingProfileUpdate, setAwaitingProfileUpdate] = useState(false);
    const previousAvatarUrlRef = useRef<string | null>(null);
    const uploadRequestIdRef = useRef(0);
    const uploadAvatar = useUploadAvatar(authUserId!);

    // Automatically upload the image after selection
    useEffect(() => {
        if (uploadImageUri && authUserId) {
            const uploadRequestId = ++uploadRequestIdRef.current;
            previousAvatarUrlRef.current = userProfile?.avatar_url ?? null;
            setUploading(true);
            logEvent(UE.AvatarUploadStarted, analyticsProps);
            setAwaitingProfileUpdate(false);
            uploadAvatar.mutate(
                { avatarUrl: uploadImageUri },
                {
                    onSuccess: () => {
                        if (uploadRequestIdRef.current !== uploadRequestId) return;
                        setUploading(false);
                        setAwaitingProfileUpdate(true);
                        logEvent(UE.AvatarUploadCompleted, analyticsProps);
                    },
                    onError: (error) => {
                        if (uploadRequestIdRef.current !== uploadRequestId) return;
                        console.error('uploadAvatar.isError', error);
                        setUploading(false);
                        setAwaitingProfileUpdate(false);
                        alert('Uploading Avatar failed');
                        logEvent(UE.AvatarUploadFailed, analyticsProps);
                    },
                }
            );
        }
    }, [uploadImageUri, authUserId]);

    useEffect(() => {
        if (!awaitingProfileUpdate) return;
        const currentAvatarUrl = userProfile?.avatar_url ?? null;
        const previousAvatarUrl = previousAvatarUrlRef.current;
        if (
            currentAvatarUrl &&
            currentAvatarUrl !== previousAvatarUrl &&
            currentAvatarUrl !== uploadImageUri &&
            /^https?:\/\//.test(currentAvatarUrl)
        ) {
            setAwaitingProfileUpdate(false);
        }
    }, [awaitingProfileUpdate, userProfile?.avatar_url, uploadImageUri]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        logEvent(UE.AvatarPressPickImage, analyticsProps);

        if (!result.canceled) {
            setUploadImageUri(result.assets[0].uri);
        }
    };

    const showSpinner = uploading || awaitingProfileUpdate;
    const Uploading = <ActivityIndicator color={colors.brandIndigo} />;
    const AvatarElement = <AvatarCircle userProfile={userProfile} size={AVATAR_SIZE} name={name} />;
    const UploadText = <Text style={styles.uploadText}>Upload</Text>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {userProfile?.avatar_url ? 'Change Your Avatar' : 'Upload Your Avatar'}
            </Text>
            <TouchableOpacity onPress={pickImage} style={styles.circleContainer}>
                <View style={styles.circle}>
                    {showSpinner ? (
                        Uploading
                    ) : (
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarOverlay} />
                            {AvatarElement}
                            {UploadText}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: fontSizes.xxl,
        fontWeight: '600',
        marginBottom: spacing.xsPlus,
        color: colors.brandText,
        fontFamily: fontFamilies.display,
    },
    circleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.disabled,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    uploadText: {
        color: colors.textOnDarkMuted,
        fontSize: fontSizes.display,
        fontWeight: 'bold',
        textShadowColor: colors.overlayStrong,
        textShadowOffset: { width: 1, height: 1 }, // Shadow offset
        textShadowRadius: spacing.xxs, // Shadow radius
        position: 'absolute',
        zIndex: 10,
        left: 0,
        right: 0,
        top: '50%',
        textAlign: 'center',
        transform: [{ translateY: -spacing.mdPlus }], // Center vertically using transform
        fontFamily: fontFamilies.display,
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlayStrong,
        zIndex: 5,
    },
});
