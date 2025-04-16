import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { DrawerNav } from "./DrawerNav";
import { tagScreenName } from "../hooks/uxCam";

export default function AppNavigator() {
    return (
        <NavigationContainer
            onStateChange={(state) => {
                if (!state) return;

                const currentRoute = state.routes[state.index];
                if (currentRoute?.name) {
                    // For UXCam
                    tagScreenName(currentRoute.name);
                }
            }}
        >

            <DrawerNav />
        </NavigationContainer>
    );
}
