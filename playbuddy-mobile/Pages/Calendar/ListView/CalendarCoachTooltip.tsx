import React from 'react';
import { Animated, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';

import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../components/styles';

const DEFAULT_TITLE = 'Add To Calendar';
const DEFAULT_ICON = 'calendar-plus-o';

type CalendarCoachTooltipProps = {
    message: string;
    title?: string;
    iconName?: string;
    onClose: () => void;
    placement?: 'above' | 'below';
    containerStyle?: StyleProp<ViewStyle>;
    arrowStyle?: StyleProp<ViewStyle>;
    anim?: Animated.Value;
};

export const CalendarCoachTooltip: React.FC<CalendarCoachTooltipProps> = ({
    message,
    title,
    iconName,
    onClose,
    placement = 'above',
    containerStyle,
    arrowStyle,
    anim,
}) => {
    if (!message) return null;

    const resolvedTitle = title ?? DEFAULT_TITLE;
    const resolvedIcon = iconName ?? DEFAULT_ICON;

    const translateY = anim
        ? anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })
        : 0;
    const scale = anim
        ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] })
        : 1;
    const animatedStyle = anim
        ? { opacity: anim, transform: [{ translateY }, { scale }] }
        : null;

    const Container = anim ? Animated.View : View;
    const arrow = (
        <View
            style={[
                styles.arrowBase,
                placement === 'above' ? styles.arrowDown : styles.arrowUp,
                arrowStyle,
            ]}
        />
    );

    return (
        <Container style={[styles.container, containerStyle, animatedStyle]}>
            {placement === 'below' && arrow}
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.iconBadge}>
                        <FAIcon name={resolvedIcon} size={12} color={colors.brandInk} />
                    </View>
                    <Text style={styles.title}>{resolvedTitle}</Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        accessibilityLabel="Close add to calendar tooltip"
                    >
                        <FAIcon name="times" size={12} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.message}>{message}</Text>
            </View>
            {placement === 'above' && arrow}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-end',
        maxWidth: 280,
    },
    card: {
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.smPlus,
        ...shadows.card,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    iconBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.surfaceLavenderOpaque,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        color: colors.brandInk,
        fontFamily: fontFamilies.body,
    },
    closeButton: {
        marginLeft: 'auto',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderOpaque,
    },
    message: {
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        letterSpacing: 0.2,
    },
    arrowBase: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    arrowDown: {
        borderTopWidth: 10,
        borderTopColor: colors.surfaceLavender,
        marginTop: -1,
    },
    arrowUp: {
        borderBottomWidth: 10,
        borderBottomColor: colors.surfaceLavender,
        marginBottom: -1,
    },
});
