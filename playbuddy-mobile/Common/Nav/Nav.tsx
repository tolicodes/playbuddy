import React from "react";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { DrawerNav } from "./DrawerNav";
import { StyleSheet, View } from "react-native";
import { EventListBackground } from "../../components/EventListBackground";
import { navigationRef } from "./navigationRef";
import { GuestSaveModalProvider } from "../../Pages/GuestSaveModal";
import { NotificationsPromptModalProvider } from "../../Pages/Notifications/NotificationsPromptModal";

const navTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: "transparent",
    },
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default function AppNavigator() {
    return (
        <NavigationContainer
            theme={navTheme}
            ref={navigationRef}
        >
            <GuestSaveModalProvider>
                <NotificationsPromptModalProvider>
                    <View style={styles.root}>
                        <EventListBackground style={styles.background} />
                        <View style={styles.root}>
                            <DrawerNav />
                        </View>
                    </View>
                </NotificationsPromptModalProvider>
            </GuestSaveModalProvider>
        </NavigationContainer>
    );
}
