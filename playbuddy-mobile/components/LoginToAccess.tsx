import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import HeaderLoginButton from "../Pages/Auth/Buttons/HeaderLoginButton";
import { logEvent } from "../Common/hooks/logger";
import { UE } from "../userEventTypes";
import { useAnalyticsProps } from "../Common/hooks/useAnalytics";

export const LoginToAccess = ({ entityToAccess }: { entityToAccess: string }) => {
    const analyticsProps = useAnalyticsProps();

    const onPress = () => {
        logEvent(UE.LoginToAccessButtonClicked, {
            ...analyticsProps,
            entity_to_access: entityToAccess
        });
    }
    return (
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
                <TouchableOpacity onPress={onPress}>
                    <HeaderLoginButton showLoginText={true} />
                </TouchableOpacity>
            </View>
        </View>
    )
}