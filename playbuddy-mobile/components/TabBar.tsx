import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, fontSizes, radius, spacing } from './styles';

type Tab = { name: string; value: string };
interface TabBarProps {
    tabs: Tab[];
    active: string;
    onPress: (value: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, active, onPress }) => {
    return (
        <View style={styles.tabRow}>
            {tabs.map(tab => {
                const isActive = active === tab.value;
                return (
                    <TouchableOpacity
                        key={tab.value}
                        onPress={() => onPress(tab.value)}
                        style={[styles.tabButton, isActive && styles.activeTab]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                    >
                        <Text style={isActive ? styles.activeTabText : styles.tabText}>
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default TabBar;

const styles = StyleSheet.create({
    // Transparent container: let the gradient show through
    tabRow: {
        backgroundColor: 'transparent',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
    },
    // Pills
    tabButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.surfaceGlass, // subtle glass for inactive
    },
    tabText: {
        fontSize: fontSizes.lg,
        fontWeight: '500',
        color: colors.textOnDarkMuted, // soft light over purple
    },
    activeTab: {
        backgroundColor: colors.accentPurple,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
            },
            android: { elevation: 3 },
        }),
    },
    activeTabText: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.white,
    },
});
