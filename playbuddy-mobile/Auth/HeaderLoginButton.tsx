import { useNavigation } from "@react-navigation/native";
import React from "react"
import { TouchableOpacity, View, Text } from "react-native"
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { NavStack } from "../types";


const HeaderLoginButton = ({ showLoginText = false }: { showLoginText?: boolean }) => {
    const navigation = useNavigation<NavStack>();

    return (
        <TouchableOpacity
            style={{
                marginRight: 15,
                justifyContent: 'center', // Centers vertically
                alignItems: 'center',     // Centers horizontally
            }
            }
            onPress={() => navigation.navigate('Login')} // replace 'Login' with your actual login screen name
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
                <FAIcon name="user" size={showLoginText ? 40 : 20} color="#007AFF" />
            </View>
            {showLoginText && <Text>Login</Text>}

        </TouchableOpacity >
    )
}

export default HeaderLoginButton