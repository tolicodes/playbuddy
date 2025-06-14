import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { commonStyles, HEADER_PURPLE } from './styles';

// Generic tag type
export type TagType = {
    id: string;
    name: string;
    icon?: string;           // MaterialIcons icon name
    color?: string;          // pill background color
    url?: string;            // clickable link
};

// Reusable Tag component (formerly Pill)
const Tag: React.FC<{ tag: TagType }> = ({ tag }) => {
    const content = (
        <View style={[styles.tag, tag.color ? { backgroundColor: tag.color } : null]}>
            {tag.icon && <MaterialIcons name={tag.icon} size={14} color="#fff" style={styles.icon} />}
            <Text style={styles.tagText}>{tag.name}</Text>
        </View>
    );

    if (tag.url) {
        return (
            <TouchableOpacity onPress={() => Linking.openURL(tag.url!)}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
};

// Renders a list of Tag components
export const TagList: React.FC<{ tags: TagType[] }> = ({ tags }) => (
    <View style={[commonStyles.paddedHorizontal16, { paddingBottom: 8 }, styles.tagsRow]}>
        {tags.map(t => (
            <Tag key={t.id} tag={t} />
        ))}
    </View>
);

/**
 * Styles specific to Tag component and TagList
 */
export const tagStyles = StyleSheet.create({
    /**
     * Pill container
     */
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: HEADER_PURPLE,
        borderRadius: 16,
        paddingHorizontal: 12,
        margin: 4,
        height: 32,
        justifyContent: 'center',
    },
    /**
     * Text inside pill
     */
    tagText: {
        color: '#fff',
        fontSize: 14,
    },
    /**
     * Icon margin
     */
    icon: {
        marginRight: 4,
    },
    /**
     * Container for multiple tags
     */
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});