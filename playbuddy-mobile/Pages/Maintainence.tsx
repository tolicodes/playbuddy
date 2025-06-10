import React from "react";
import { Text, View, StyleSheet } from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome';

export const MaintainenceScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Maintainence</Text>
            <FAIcon name="wrench" size={80} color="#999" style={{ marginBottom: 20 }} />


            <Text style={styles.text}>
                PlayBuddy is down for maintainence and will be back in a few hours. Sorry!!
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
    },
    text: {
        fontSize: 18,
        textAlign: "center",
    },
});