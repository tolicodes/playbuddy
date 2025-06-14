import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { ACCENT_PURPLE, HEADER_PURPLE } from '../../../components/styles';
import type { Facilitator } from '../../../Common/types/commonTypes';

const Separator = () => <View style={styles.separator} />;

const TagsLocation = ({ facilitator }: { facilitator: Facilitator }) => (
    facilitator.location ? (
        <View style={styles.locationRowWhite}>
            <MaterialIcons name="location-on" size={18} color="#888" />
            <Text style={styles.locationWhite}>From {facilitator.location}</Text>
        </View>
    ) : null
);

const TagList = ({ tags }: { tags: { id: string; name: string }[] }) => (
    <View style={styles.tagsRow}>
        {tags.map(t => (
            <View key={t.id} style={styles.pill}>
                <Text style={styles.pillText}>{t.name}</Text>
            </View>
        ))}
    </View>
);

const BioTab = ({ bio, facilitator }: { bio: string; facilitator: Facilitator }) => (
    <View style={styles.container}>
        <TagsLocation facilitator={facilitator} />
        <Separator />
        <View style={styles.bioContainer}>
            <Markdown style={styles.markdown}>{bio}</Markdown>
        </View>
        <TagList tags={facilitator.tags || []} />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, paddingVertical: 16 },
    separator: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
    locationRowWhite: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    locationWhite: { color: '#555', marginLeft: 6 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 },
    pill: { backgroundColor: HEADER_PURPLE, borderRadius: 16, paddingHorizontal: 12, margin: 4, height: 32, justifyContent: 'center' },
    pillText: { color: '#fff', fontSize: 14 },

    bioContainer: { padding: 16 },
    markdown: { body: { color: '#333', fontSize: 16, lineHeight: 22 } },
});

export { Separator, TagsLocation, BioTab };
