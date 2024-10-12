import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabaseClient'; // Supabase client
import { useUserContext } from './UserContext';
import { useQueryClient } from '@tanstack/react-query';

export const Avatar = () => {
    const [uploadImageUri, setUploadImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const { authUserId, userProfile } = useUserContext();
    const queryClient = useQueryClient();

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
            uploadImage(authUserId);
        }
    }, [uploadImageUri, authUserId]);

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

    const updateUserAvatar = async (authUserId: string, avatarUrl: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ avatar_url: avatarUrl })
                .eq('user_id', authUserId);

            if (error) {
                throw new Error(`Error updating user avatar: ${error.message}`);
            }

            queryClient.invalidateQueries(['userProfile', authUserId]);
        } catch (error) {
            console.error('Error updating user avatar:', error.message);
        }
    };

    const uploadImage = async (authUserId: string) => {
        if (!uploadImageUri || !authUserId) return;

        try {
            setUploading(true);
            const response = await fetch(uploadImageUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const fileName = `public/${Date.now()}.jpg`;

            // Upload the image to Supabase Storage
            const { error } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, { contentType: blob.type });

            if (error) {
                throw error;
            }

            const { data } = await supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            await updateUserAvatar(authUserId, data.publicUrl);
            alert('Image uploaded successfully!');
        } catch (error) {
            console.error('Error uploading image:', error.message, error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const avatarUrl = userProfile?.avatar_url;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Upload Your Avatar</Text>
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
