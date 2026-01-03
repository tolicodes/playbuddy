// components/SectionCard.tsx
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, fontFamilies, radius, spacing } from '../../../components/styles';

type Props = {
    title?: string;
    icon?: string;                // MaterialIcons name (optional)
    children: ReactNode;
    style?: ViewStyle;
    titleStyle?: TextStyle;
    tone?: 'default' | 'tint' | 'warning' | 'info';
};

const TONES = {
    default: { surface: colors.white, tint: 'rgba(106,27,154,0.10)' },
    tint: { surface: colors.white, tint: 'rgba(106,27,154,0.12)' },
    warning: { surface: '#FFF9E8', tint: 'rgba(255,176,0,0.25)' },
    info: { surface: '#F3F7FF', tint: 'rgba(36,112,255,0.18)' },
};

export default function SectionCard({
    title,
    icon,
    children,
    style,
    titleStyle,
    tone = 'tint',
}: Props) {
    const colors = TONES[tone];
    return (
        <View style={[styles.outer, { backgroundColor: colors.tint }, style]}>
            {/* gradient “hairline” */}
            <LinearGradient
                colors={['rgba(255,255,255,0.35)', 'rgba(0,0,0,0.06)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.border}
            />
            <View style={[styles.inner, { backgroundColor: colors.surface }]}>
                {title ? (
                    <View style={styles.header}>
                        {icon ? <MaterialIcons name={icon} size={16} color="#6A1B9A" style={{ marginRight: 6 }} /> : null}
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
        shadowColor: 'rgba(0,0,0,0.15)',
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
        fontSize: 12.5,
        fontWeight: '800',
        letterSpacing: 0.5,
        color: '#6A1B9A',
        fontFamily: fontFamilies.body,
    },
});
