import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TagPill = ({ label, onRemove, variant = 'selected' }: {
    label: string;
    onRemove?: () => void;
    variant?: 'selected' | 'suggestion';
}) => (
    <View style={[styles.tagPill, variant === 'suggestion' && styles.suggestionPill]}>
        <Text style={styles.tagText}>{label}</Text>
        {onRemove && (
            <TouchableOpacity onPress={onRemove} style={styles.removeIcon}>
                <Ionicons name="close-circle" size={16} color="#999" />
            </TouchableOpacity>
        )}
    </View>
);

// Pill component
export const Pill = ({ label, selected, onPress }: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.pill, selected && styles.pillSelected]}
        onPress={onPress}
    >
        <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    tagPill: {
        flexDirection: 'row',
        backgroundColor: '#e2e2f0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 6,
        alignItems: 'center',
    },
    suggestionPill: {
        backgroundColor: '#dce5ff',
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
    },
    removeIcon: {
        marginLeft: 6,
    },
    pillList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#EEE',
        marginRight: 8,
    },
    pillSelected: {
        backgroundColor: '#7F5AF0',
    },
    pillText: {
        color: '#444',
        fontSize: 13,
        fontWeight: '500',
    },
    pillTextSelected: {
        color: '#FFF',
    },
    dropdownContainer: {
        flex: 1,
        marginVertical: 12,
    },
    dropdownLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        color: '#333',
    },
    dropdownPillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dropdownPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#EEE',
        marginBottom: 8,
    },
    dropdownPillSelected: {
        backgroundColor: '#7F5AF0',
    },
    dropdownPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#444',
    },
    dropdownPillTextSelected: {
        color: '#FFF',
    },
});

export default { TagPill, Pill };
