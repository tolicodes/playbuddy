import { useNavigation } from "@react-navigation/native";
import React from "react"
import { TouchableOpacity, View, Text, Image } from "react-native"
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { NavStack } from "../types";
import * as amplitude from '@amplitude/analytics-react-native';
import { useUserContext } from "./UserContext";


const HeaderLoginButton = ({ showLoginText = false }: { showLoginText?: boolean }) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId, userProfile } = useUserContext();

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
                navigation.navigate(!authUserId ? 'Login' : 'Profile')
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
                        <Image source={{ uri: userProfile?.avatar_url }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                        :
                        <FAIcon name="user" size={showLoginText ? 40 : 20} color="#007AFF" />
                }
            </View>
            {showLoginText && <Text>Login</Text>}

        </TouchableOpacity >
    )
}

export default HeaderLoginButton