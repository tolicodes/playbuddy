// components/SectionCard.tsx
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../components/styles';

type Props = {
    title?: string;
    icon?: string;                // MaterialIcons name (optional)
    children: ReactNode;
    style?: ViewStyle;
    titleStyle?: TextStyle;
    tone?: 'default' | 'tint' | 'warning' | 'info';
};

const TONES = {
    default: { surface: colors.white, tint: colors.tintVioletSoft },
    tint: { surface: colors.white, tint: colors.tintViolet },
    warning: { surface: colors.surfaceWarning, tint: colors.tintWarning },
    info: { surface: colors.surfaceInfo, tint: colors.tintInfo },
};

export default function SectionCard({
    title,
    icon,
    children,
    style,
    titleStyle,
    tone = 'tint',
}: Props) {
    const toneColors = TONES[tone];
    return (
        <View style={[styles.outer, { backgroundColor: toneColors.tint }, style]}>
            {/* gradient “hairline” */}
            <LinearGradient
                colors={[colors.borderOnDark, colors.shadowSoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.border}
            />
            <View style={[styles.inner, { backgroundColor: toneColors.surface }]}>
                {title ? (
                    <View style={styles.header}>
                        {icon ? <MaterialIcons name={icon} size={16} color={colors.brandViolet} style={{ marginRight: 6 }} /> : null}
                        <Text style={[styles.title, titleStyle]}>{title.toUpperCase()}</Text>
                    </View>
                ) : null}
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        borderRadius: radius.lg,
        padding: 2,              // space for gradient hairline
        marginTop: spacing.mdPlus,
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: radius.lg,
    },
    inner: {
        borderRadius: radius.md,
        padding: spacing.mdPlus,
        shadowColor: colors.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: fontSizes.smPlus,
        fontWeight: '800',
        letterSpacing: 0.5,
        color: colors.brandViolet,
        fontFamily: fontFamilies.body,
    },
});
