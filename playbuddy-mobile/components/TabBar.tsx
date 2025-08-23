import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

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
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    // Pills
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)', // subtle glass for inactive
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#E8E8E8', // soft light over purple
    },
    activeTab: {
        backgroundColor: '#7F5AF0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
            },
            android: { elevation: 3 },
        }),
    },
    activeTabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
