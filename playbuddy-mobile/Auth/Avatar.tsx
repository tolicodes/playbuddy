import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabaseClient'; // Supabase client
import { useUserContext } from './UserContext';
import { useQueryClient } from '@tanstack/react-query';


export const Avatar = () => {
    const [uploadImageUri, setUploadImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const { userId, userProfile } = useUserContext();

    const queryClient = useQueryClient()

    // Ask for permission to access the gallery
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera roll permissions to make this work!');
            }
        })();
    }, []);

    // Automatically upload image after selection
    useEffect(() => {
        if (uploadImageUri) {
            uploadImage(userId);
        }
    }, [uploadImageUri, userId]);

    // Function to pick an image
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
            base64: true,

        });

        if (!result.canceled) {
            setUploadImageUri(result.assets[0].uri);
        }
    };

    const updateUserAvatar = async (userId: string, avatarUrl: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ avatar_url: avatarUrl })
                .eq('user_id', userId);

            if (error) {
                throw new Error(`Error updating user avatar: ${error.message}`);
            }

            queryClient.invalidateQueries(['userProfile', userId]);
        } catch (error) {
            console.error('Error updating user avatar:', error.message);
        }
    };


    // Function to upload the selected image to Supabase
    const uploadImage = async (userId) => {
        if (!uploadImageUri || !userId) return;

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

            const { data, error: getPublicUrlError } = await supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            if (getPublicUrlError) {
                throw new Error(`Error getting public URL for avatar: ${getPublicUrlError.message}`);
            }

            await updateUserAvatar(userId, data.publicUrl);
            alert('Image uploaded successfully!');
        } catch (error) {
            console.error('Error uploading image:', error.message);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const avatarUrl = userProfile?.avatar_url;

    return (
        <TouchableOpacity onPress={pickImage}>
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
    );
}

const styles = StyleSheet.create({
    circle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // ensures image fits within the circle
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
