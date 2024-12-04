import React from "react";
import { View, Text, } from "react-native";
import HeaderLoginButton from "../Pages/Auth/Buttons/LoginButton";

export const LoginToAccess = ({ entityToAccess }: { entityToAccess: string }) => (
    <View style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',  // Centers vertically
        alignItems: 'center',      // Centers horizontally
        height: '100%',            // Ensure the height takes full screen
    }}>
        <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 20 }}>
            Login to access {entityToAccess}
        </Text>
        <View style={{ marginTop: 10, }}>
            <HeaderLoginButton showLoginText={true} />
        </View>
    </View>
)