import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../components/styles';

export interface Tag { id: string; name: string; }
interface Props { tags: Tag[]; }

export default function TagList({ tags }: Props) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
            {tags.map(t => (
                <View key={t.id} style={styles.pill}>
                    <Text style={styles.text}>{t.name}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: spacing.sm },
    pill: {
        backgroundColor: colors.surfaceLavenderStrong,
        borderRadius: radius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginRight: spacing.sm,
    },
    text: {
        color: colors.brandLavender,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
    }
});

