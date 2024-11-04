import { useNavigation } from "@react-navigation/native";
import React from "react"
import { TouchableOpacity, View, Text } from "react-native"
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { NavStack } from "../types";
import * as amplitude from '@amplitude/analytics-react-native';
import { useUserContext } from "../contexts/UserContext";
import { getSmallAvatarUrl } from "../Common/imageUtils";
import { Image } from 'expo-image'


const HeaderLoginButton = ({ showLoginText = false }: { showLoginText?: boolean }) => {
    const { navigate } = useNavigation<NavStack>();
    const { authUserId, userProfile } = useUserContext();

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url);

    const initials = userProfile?.name?.split(' ').map(name => name[0]).join('').slice(0, 2)

    return (
        <TouchableOpacity
            style={{
                marginRight: 15,
                justifyContent: 'center', // Centers vertically
                alignItems: 'center',     // Centers horizontally
            }
            }
            onPress={() => {
                amplitude.logEvent('login_button_clicked')
                navigate(!authUserId ? 'Login' : 'User Profile')
            }}
        >
            <View style={{
                width: showLoginText ? 50 : 30,
                height: showLoginText ? 50 : 30,
                borderRadius: 30, // Ensure it's fully rounded (half of width/height)
                backgroundColor: 'white',
                borderColor: '#007AFF',
                borderWidth: 1,
                justifyContent: 'center', // Centers vertically
                alignItems: 'center',     // Centers horizontally
            }}>
                {
                    authUserId ?
                        avatarUrl
                            ? <Image source={{ uri: avatarUrl }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                            : <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#007AFF', }}>{initials}</Text>
                        :
                        <FAIcon name="user" size={showLoginText ? 40 : 20} color="#007AFF" />
                }
            </View>
            {showLoginText && <Text>Login</Text>}

        </TouchableOpacity >
    )
}

export default HeaderLoginButton