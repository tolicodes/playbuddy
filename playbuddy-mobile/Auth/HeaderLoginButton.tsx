import { useNavigation } from "@react-navigation/native";
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { NavStack } from "../types";
import * as amplitude from '@amplitude/analytics-react-native';
import { useUserContext } from "../contexts/UserContext";
import { getSmallAvatarUrl } from "../Common/imageUtils";
import { Image } from 'expo-image';

const HeaderLoginButton = ({
    showLoginText = false,
    size = 30,
    headerButton = false,
    register = false,
    onPressButton
}: {
    showLoginText?: boolean;
    size?: number;
    headerButton?: boolean;
    register?: boolean;
    onPressButton?: () => void;
}) => {
    const { navigate } = useNavigation<NavStack>();
    const { authUserId, userProfile, isLoadingUserProfile, authReady } = useUserContext();

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url);
    const initials = userProfile?.name?.split(' ').map(name => name[0]).join('').slice(0, 2);

    const handlePress = () => {
        amplitude.logEvent('login_button_clicked');
        navigate(!authUserId ? 'Login' : 'User Profile');
        if (onPressButton) {
            onPressButton();
        }
    };

    if (isLoadingUserProfile || !authReady) {
        return <ActivityIndicator />;
    }

    return (
        <TouchableOpacity
            style={headerButton ? styles.headerButtonContainer : styles.buttonContainer}
            onPress={handlePress}
        >
            <View style={[
                styles.avatarContainer,
                {
                    width: showLoginText ? 50 : size,
                    height: showLoginText ? 50 : size,
                    borderRadius: size / 2
                }
            ]}>
                {authUserId ? (
                    avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.initialsText}>{initials}</Text>
                    )
                ) : (
                    <FAIcon name="user" size={showLoginText ? 40 : 20} color="#007AFF" />
                )}
            </View>
            {showLoginText && (
                <Text style={styles.loginText}>
                    {register ? 'Register' : 'Login'}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        alignSelf: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    headerButtonContainer: {
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarContainer: {
        backgroundColor: 'white',
        borderColor: '#007AFF',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    initialsText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    loginText: {
        color: '#007AFF',
        fontWeight: 'bold',
        marginTop: 5,
    }
});

export default HeaderLoginButton;