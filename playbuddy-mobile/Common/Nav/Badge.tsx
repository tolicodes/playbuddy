import React from "react";
import { View, Text } from "react-native";

export const Badge = ({ count }: { count: number }) => (
    <View
        style={{
            position: 'absolute',
            right: -15,
            top: -10,
            backgroundColor: 'red',
            borderRadius: 6,
            paddingHorizontal: 5,
            height: 25,
            justifyContent: 'center',
            alignItems: 'center',
        }}
    >
        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{count}</Text>
    </View>
);  