import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../components/styles';
import type { Facilitator } from '../../../Common/types/commonTypes';

const Separator = () => <View style={styles.separator} />;

const TagsLocation = ({ facilitator }: { facilitator: Facilitator }) => (
    facilitator.location ? (
        <View style={styles.locationRowWhite}>
            <MaterialIcons name="location-on" size={fontSizes.xxl} color={colors.textSecondary} />
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
            <Markdown>{bio}</Markdown>
        </View>
        <TagList tags={facilitator.tags || []} />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: spacing.lg, backgroundColor: colors.white },
    separator: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
    locationRowWhite: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
    locationWhite: { color: colors.textMuted, marginLeft: spacing.xsPlus, fontFamily: fontFamilies.body },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    pill: {
        backgroundColor: colors.headerPurple,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        margin: spacing.xs,
        height: spacing.xxxl,
        justifyContent: 'center',
    },
    pillText: { color: colors.white, fontSize: fontSizes.base, fontFamily: fontFamilies.body },

    bioContainer: { padding: spacing.lg, paddingTop: 0 },
});

export { Separator, TagsLocation, BioTab };
