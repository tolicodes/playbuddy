import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUserContext } from '../hooks/UserContext';
import { useUploadAvatar } from '../hooks/useUserProfile';
import { logEvent } from '../../../Common/hooks/logger';
import { AvatarCircle } from './AvatarCircle';
import { Buddy } from '../../Buddies/hooks/BuddiesContext';

export const Avatar = ({ name }: { name?: string }) => {
    const { authUserId, userProfile, session } = useUserContext();

    const [uploadImageUri, setUploadImageUri] = useState<string | null>(
        session?.user?.user_metadata?.avatar_url || null
    );

    const [uploading, setUploading] = useState(false);
    const uploadAvatar = useUploadAvatar(authUserId!);

    // Automatically upload the image after selection
    useEffect(() => {
        if (uploadImageUri && authUserId) {
            setUploading(true);
            uploadAvatar.mutate({ avatarUrl: uploadImageUri });
            logEvent('avatar_upload_started');
        }
    }, [uploadImageUri, authUserId]);

    useEffect(() => {
        if (uploadAvatar.isSuccess) {
            setUploading(false);
            logEvent('avatar_upload_completed');
        } else if (uploadAvatar.isError) {
            console.error('uploadAvatar.isError', uploadAvatar.error);
            setUploading(false);
            alert('Uploading Avatar failed');
            logEvent('avatar_upload_failed');
        }
    }, [uploadAvatar.isSuccess, uploadAvatar.isError]);

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

        logEvent('avatar_press_pick_image');

        if (!result.canceled) {
            setUploadImageUri(result.assets[0].uri);
        }
    };

    const Uploading = <ActivityIndicator />;
    const AvatarElement = <AvatarCircle userProfile={userProfile} size={150} name={name} />;
    const UploadText = <Text style={styles.uploadText}>Upload</Text>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {userProfile?.avatar_url ? 'Change Your Avatar' : 'Upload Your Avatar'}
            </Text>
            <TouchableOpacity onPress={pickImage} style={styles.circleContainer}>
                <View style={styles.circle}>
                    {uploading ? (
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
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
    circleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    uploadText: {
        color: 'rgba(255, 255, 255, 0.8)', // Changed to a semi-transparent white for overlay effect
        fontSize: 30,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.5)', // Added shadow for better visibility
        textShadowOffset: { width: 1, height: 1 }, // Shadow offset
        textShadowRadius: 2, // Shadow radius
        position: 'absolute',
        zIndex: 10,
        left: 0,
        right: 0,
        top: '50%',
        textAlign: 'center',
        transform: [{ translateY: -15 }], // Center vertically using transform
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Gray out the image
        zIndex: 5,
    },
});
