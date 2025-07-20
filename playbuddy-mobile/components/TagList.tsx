import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { commonStyles, HEADER_PURPLE } from './styles';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';

export type TagType = {
    id: string;
    name: string;
    icon?: string;              // MaterialIcons icon name
    color?: string;             // pill background color
    url?: string;               // clickable link
    facilitatorId?: string;     // for analytics
};

const Tag: React.FC<{ tag: TagType }> = ({ tag }) => {
    const analyticsProps = useAnalyticsProps();
    const content = (
        <View style={[tagStyles.tag, tag.color ? { backgroundColor: tag.color } : null]}>
            {tag.icon && <MaterialIcons name={tag.icon} size={14} color="#fff" style={tagStyles.icon} />}
            <Text style={tagStyles.tagText}>{tag.name}</Text>
        </View>
    );

    if (tag.url) {
        return (
            <TouchableOpacity onPress={() => {
                logEvent(UE.TagPress, {
                    ...analyticsProps,
                    entity_type: 'facilitator',
                    entity_id: tag.facilitatorId,
                    url: tag.url,
                    name: tag.name,
                });
                Linking.openURL(tag.url!);
            }}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
};

export const TagList: React.FC<{ tags: TagType[] }> = ({ tags }) => (
    <View style={[commonStyles.paddedHorizontalMedium, { paddingBottom: 8 }, tagStyles.tagsRow]}>
        {tags.map(t => (
            <Tag key={t.id} tag={t} />
        ))}
    </View>
);

export const tagStyles = StyleSheet.create({
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
    tagText: {
        color: '#fff',
        fontSize: 14,
    },

    icon: {
        marginRight: 4,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

});