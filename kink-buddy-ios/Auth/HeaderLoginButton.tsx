import { useNavigation } from "@react-navigation/native";
import React from "react"
import { TouchableOpacity, View, Text } from "react-native"
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { NavStack } from "../types";


export default ({ showLoginText = false }) => {
    const navigation = useNavigation<NavStack>();

    return (
        <TouchableOpacity
            style={{ marginRight: 15 }
            }
            onPress={() => navigation.navigate('Login')} // replace 'Login' with your actual login screen name
        >
            <View style={{
                width: 30,
                height: 30,
                borderRadius: 20,
                backgroundColor: 'white',
                borderColor: '#007AFF',
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
            }}>
                <FAIcon name="user" size={20} color="#007AFF" />
            </View>
            {showLoginText && <Text>Login</Text>}

        </TouchableOpacity >
    )
}