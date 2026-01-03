import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../../components/styles';
import { LinkifyText } from './LinkifyText';
import type { Munch } from '../../commonTypes';

export const MunchDetailsMainTab = ({ munch }: { munch: Munch }) => {
    const formatHosts = (hosts: string | null) => {
        if (!hosts) return null;
        const list = hosts
            .split(/\r?\n|,/) // split on newline or comma
            .map((h) => h.trim())
            .filter((h) => h.length > 0);
        return list.join(' \u2022 '); // dot separator
    };

    const renderField = (label: string, value: string | null) => {
        if (!value) return null;
        return (
            <View style={styles.fieldRow} key={label}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <Text style={styles.title}>{munch.title}</Text>
                {(munch.schedule_text || munch.cadence) && (
                    <Text style={styles.scheduleText}>
                        {munch.schedule_text ?? ''}
                        {munch.schedule_text && munch.cadence ? ' \u2022 ' : ''}
                        {munch.cadence ?? ''}
                    </Text>
                )}
            </View>

            {munch.notes && (
                <View style={styles.descriptionCard}>
                    <Text style={styles.sectionHeader}>Description</Text>
                    <LinkifyText platform="fetlife" style={styles.descriptionText}>
                        {munch.notes}
                    </LinkifyText>
                </View>
            )}

            <View style={styles.instructionsCard}>
                <Text style={styles.sectionHeader}>How to Go to This Munch</Text>
                <View style={styles.numberedContainer}>
                    <Text style={styles.numberedLine}>1. Tap a host’s Fetlife profile.</Text>
                    <Text style={styles.numberedLine}>2. Scroll to the bottom to find "Events Organizing".</Text>
                    <Text style={styles.numberedLine}>3. View upcoming munches. If none, none scheduled.</Text>
                    <Text style={styles.numberedLine}>4. Message a host for details.</Text>
                </View>
                {munch.hosts && (
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Hosts' Fetlife</Text>
                        <LinkifyText platform="fetlife" style={styles.fieldValue}>
                            {formatHosts(munch.hosts)}
                        </LinkifyText>
                    </View>
                )}
                {munch.website && (
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Website</Text>
                        <LinkifyText style={styles.fieldValue}>{munch.website}</LinkifyText>
                    </View>
                )}
            </View>

            <View style={styles.detailCard}>
                {renderField('Cost of Entry', munch.cost_of_entry)}
                {renderField('Age Restriction', munch.age_restriction)}
                {renderField('Open to Everyone?', munch.open_to_everyone)}
                {renderField('Status', munch.status)}
            </View>

            <View style={styles.thanksCard}>
                <Text style={styles.sectionHeader}>Special Thanks</Text>
                <Text style={styles.thanksText}>
                    This list was compiled by a community member, <Text style={styles.boldText}>Rose</Text>.
                </Text>
                <Text style={styles.thanksMessage}>
                    <Text style={styles.boldText}>Message from Rose: </Text>
                    <LinkifyText platform="fetlife">
                        Hi, I’m @Rosamaru. I hope this is helpful in your kink/BDSM journey. Pace yourself — it pays off.
                    </LinkifyText>
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: spacing.lg, paddingBottom: spacing.jumbo },
    headerCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
            },
            android: { elevation: 3 },
        }),
    },
    title: { fontSize: fontSizes.title, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, fontFamily: fontFamilies.display },
    scheduleText: { fontSize: fontSizes.xl, color: colors.textBrown, fontFamily: fontFamilies.body },
    descriptionCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionHeader: { fontSize: fontSizes.xxl, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm, fontFamily: fontFamilies.body },
    descriptionText: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.xl, fontFamily: fontFamilies.body },
    instructionsCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    numberedContainer: { marginTop: spacing.sm },
    numberedLine: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.xl, marginBottom: spacing.xsPlus, fontFamily: fontFamilies.body },
    fieldRow: { marginBottom: spacing.md },
    fieldLabel: { fontSize: fontSizes.base, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, fontFamily: fontFamilies.body },
    fieldValue: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.lg, fontFamily: fontFamilies.body },
    detailCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    thanksCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    thanksText: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.lg, marginBottom: spacing.sm, fontFamily: fontFamilies.body },
    thanksMessage: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.lg, fontFamily: fontFamilies.body },
    boldText: { fontWeight: '600' },
});
