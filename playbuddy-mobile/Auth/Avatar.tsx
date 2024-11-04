import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker';
import { useUserContext } from '../contexts/UserContext';
import { getSmallAvatarUrl } from '../Common/imageUtils';
import { useUploadAvatar } from './useUserProfile';


export const Avatar = () => {
    const [uploadImageUri, setUploadImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const { authUserId, userProfile } = useUserContext();
    const uploadAvatar = useUploadAvatar();

    // Request permission to access the gallery
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera roll permissions to make this work!');
            }
        })();
    }, []);

    // Automatically upload the image after selection
    useEffect(() => {
        if (uploadImageUri && authUserId) {
            setUploading(true);
            uploadAvatar.mutate({ avatarUrl: uploadImageUri });
        }
    }, [uploadImageUri, authUserId]);

    useEffect(() => {
        if (uploadAvatar.isSuccess) {
            setUploading(false);
        } else if (uploadAvatar.isError) {
            setUploading(false);
            alert('Uploading Avatar failed')
        }
    }, [uploadAvatar.isSuccess, uploadAvatar.isError])

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setUploadImageUri(result.assets[0].uri);
        }
    };

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url, 300);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{
                userProfile?.avatar_url ? 'Change Your Avatar' : 'Upload Your Avatar'
            }</Text>
            <Text style={styles.subtitle}>This is how your buddies will identify you in the app!</Text>
            <TouchableOpacity onPress={pickImage} style={styles.circleContainer}>
                <View style={styles.circle}>
                    {uploading ? (
                        <ActivityIndicator size="large" color="#fff" />
                    ) : avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.image} />
                    ) : (
                        <Text style={styles.text}>Upload</Text>
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
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 20,
        textAlign: 'center',
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
    image: {
        width: '100%',
        height: '100%',
    },
    text: {
        color: '#fff',
        fontSize: 18,
    },
});
