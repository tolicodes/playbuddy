import React from "react";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { DrawerNav } from "./DrawerNav";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { gradients } from "../../components/styles";

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
});

export default function AppNavigator() {
    return (
        <NavigationContainer
            theme={navTheme}
        >

            <View style={styles.root}>
                <LinearGradient
                    colors={gradients.nav}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                >
                </LinearGradient>
                <View style={styles.root}>
                    <DrawerNav />
                </View>
            </View>
        </NavigationContainer>
    );
}
