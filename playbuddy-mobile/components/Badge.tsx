import React from "react";
import { View, Text } from "react-native";
import { colors, fontFamilies, fontSizes, radius, spacing } from "./styles";

export const Badge = ({ count }: { count: number }) => (
    <View
        style={{
            position: 'absolute',
            right: -20,
            top: -10,
            backgroundColor: colors.badgeAlert,
            borderRadius: radius.xs,
            paddingHorizontal: spacing.xsPlus,
            height: 25,
            justifyContent: 'center',
            alignItems: 'center',
        }}
    >
        <Text style={{ color: colors.white, fontSize: fontSizes.xs, fontWeight: 'bold', fontFamily: fontFamilies.body }}>
            {count}
        </Text>
    </View>
);  
