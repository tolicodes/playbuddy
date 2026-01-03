import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    StyleProp,
    ViewStyle,
    TextStyle,
} from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { NavStack } from "../../../Common/Nav/NavStackType";
import { useUserContext } from "../hooks/UserContext";
import { getSmallAvatarUrl } from "../../../Common/hooks/imageUtils";
import { Image } from 'expo-image';
import { logEvent } from "../../../Common/hooks/logger";
import { UE } from "../../../userEventTypes";
import { useAnalyticsProps } from "../../../Common/hooks/useAnalytics";

const HeaderLoginButton = ({
    showLoginText = false,
    size = 30,
    headerButton = false,
    register = false,
    onPressButton,
    entityToAccess = 'events',
    buttonStyle,
    textStyle,
    iconColor,
    avatarStyle,
}: {
    showLoginText?: boolean;
    size?: number;
    headerButton?: boolean;
    register?: boolean;
    onPressButton?: () => void;
    entityToAccess?: string;
    buttonStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    iconColor?: string;
    avatarStyle?: StyleProp<ViewStyle>;
}) => {
    const { navigate } = useNavigation<NavStack>();
    const { authUserId, userProfile, isLoadingUserProfile, isLoadingAuth, isProfileComplete } = useUserContext();

    const analyticsProps = useAnalyticsProps();
    const analyticsPropsPlusEntity = {
        ...analyticsProps,
        entity_to_access: entityToAccess
    }

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url);
    const initials = userProfile?.name?.split(' ').map(name => name[0]).join('').slice(0, 2);

    const handlePressHeaderButton = () => {
        logEvent(UE.HeaderLoginButtonClicked, analyticsPropsPlusEntity);
        if (onPressButton) {
            onPressButton();
        } else {
            if (isProfileComplete) {
                navigate('AuthNav', { screen: 'Profile' });
            } else {
                navigate('AuthNav', { screen: 'Login Form' });
            }
        }
    };

    if (isLoadingUserProfile || isLoadingAuth) {
        return <ActivityIndicator />;
    }

    const resolvedIconColor = iconColor ?? '#007AFF';
    const sizeValue = showLoginText ? 50 : size;
    const containerStyle = headerButton ? styles.headerButtonContainer : styles.buttonContainer;

    return (
        <TouchableOpacity
            style={[containerStyle, buttonStyle]}
            onPress={handlePressHeaderButton}
        >
            <View style={[
                styles.avatarContainer,
                {
                    width: sizeValue,
                    height: sizeValue,
                    borderRadius: sizeValue / 2,
                },
                avatarStyle,
            ]}>
                {authUserId ? (
                    avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <Text style={[styles.initialsText, { color: resolvedIconColor }]}>{initials}</Text>
                    )
                ) : (
                    <FAIcon name="user" size={showLoginText ? 40 : 20} color={resolvedIconColor} />
                )}
            </View>
            {showLoginText && (
                <Text style={[styles.loginText, textStyle]}>
                    {register ? 'Register or Login' : 'Login'}
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
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
        // width: '100%',
        borderColor: '#007AFF',
        borderWidth: 2,
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
        color: 'white',
        fontWeight: 'bold',
        marginTop: 5,
    }
});

export default HeaderLoginButton;
