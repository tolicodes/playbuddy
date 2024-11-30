import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Input } from "@rneui/themed";
import { useUserContext } from "../hooks/UserContext";
import { Avatar } from '../Buttons/Avatar';
import { logEvent } from '../../../Common/hooks/logger';
import { useUpdateUserProfile } from "../hooks/useUserProfile";
import { signOut } from "../hooks/authUtils";
import { useNavigation } from "@react-navigation/native";
import { NavStack } from "../../../types";

export const ProfileDetailsForm = () => {
    const { authUserId, userProfile, isLoadingUserProfile, session } = useUserContext()
    const { mutate: updateUserProfile } = useUpdateUserProfile(authUserId || '')
    const [name, setName] = useState<string>(
        userProfile?.name
        // for google
        || session?.user?.user_metadata?.full_name
        || ''
    );

    const onPressCreateAccount = () => {
        if (!name) {
            Alert.alert('Please enter a name');
            return;
        }

        if (!userProfile?.avatar_url) {
            Alert.alert('Please select an avatar');
            return;
        }

        logEvent('profile_details_press_save');
        updateUserProfile({ name, avatar_url: userProfile?.avatar_url });
    }
    const { navigate } = useNavigation<NavStack>();

    const onPressSignOut = async () => {
        logEvent('account_details_press_sign_out');
        signOut();
        navigate('Main Calendar');
    }


    if (isLoadingUserProfile) {
        return <ActivityIndicator />
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.centeredContent}>
                    <Text style={styles.headerText}>Create Your Account</Text>
                    <Text style={styles.subHeaderText}>This is how your buddies will identify you</Text>

                    <Input
                        label="Display Name"
                        labelStyle={styles.inputLabel}
                        inputStyle={styles.inputText}
                        onChangeText={setName}
                        value={name}
                        placeholder="Your Display Name"
                    />

                    <View style={{ marginVertical: 20 }}>
                        <Avatar />
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
        backgroundColor: '#F2F2F7',
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    centeredContent: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    headerText: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#000',
        textAlign: 'center',
    },
    subHeaderText: {
        fontSize: 17,
        marginBottom: 100,
        color: '#000',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 16,
        width: '100%',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    signOutButton: {
        backgroundColor: '#FF3B30',
    },
    inputLabel: {
        color: 'black',
        textAlign: 'center',
        fontWeight: '500',
        fontSize: 20,
        marginBottom: 10,
        // display: 'none',
    },
    inputText: {
        color: '#000',
        borderColor: '#007AFF', // iOS blue color for visibility
        borderWidth: 2, // Increased border width for better visibility
        borderRadius: 8,
        padding: 12, // Increased padding for a more comfortable touch
        backgroundColor: '#FFFFFF',
        shadowColor: '#000', // Adding shadow for depth
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2, // For Android compatibility
    },
});