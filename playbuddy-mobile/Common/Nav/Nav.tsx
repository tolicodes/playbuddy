import React from "react";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { DrawerNav } from "./DrawerNav";
import { tagScreenName } from "../hooks/uxCam";
import { LinearGradient } from "expo-linear-gradient";

const navTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: "transparent",
    },
};

export default function AppNavigator() {
    return (
        <NavigationContainer
            theme={navTheme}
            onStateChange={(state) => {
                if (!state) return;

                const currentRoute = state.routes[state.index];
                if (currentRoute?.name) {
                    // For UXCam
                    tagScreenName(currentRoute.name);
                }
            }}
        >

            <LinearGradient
                colors={['#7C3BD6', '#C248CE', '#FF5293']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <DrawerNav />
            </LinearGradient>
        </NavigationContainer>
    );
}
