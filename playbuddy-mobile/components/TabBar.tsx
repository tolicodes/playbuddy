import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Tab = {
    name: string;
    value: string;
};

interface TabBarProps {
    tabs: Tab[];
    active: string;
    onPress: (value: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, active, onPress }) => {
    return (
        <View style={styles.tabContainer}>
            <View style={styles.tabRow}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.value}
                        style={[styles.tabButton, active === tab.value && styles.activeTab]}
                        onPress={() => onPress(tab.value)}
                    >
                        <Text style={active === tab.value ? styles.activeTabText : styles.tabText}>
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default TabBar;

const styles = StyleSheet.create({
    tabContainer: {
        backgroundColor: '#fff',
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 5,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    tabText: {
        color: '#888',
        fontSize: 14,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#7F5AF0',
    },
    activeTabText: {
        color: '#7F5AF0',
        fontWeight: '600',
        fontSize: 14,
    },
});
