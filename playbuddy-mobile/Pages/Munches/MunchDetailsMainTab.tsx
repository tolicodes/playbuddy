import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { LAVENDER_BACKGROUND } from '../../components/styles';
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
    content: { padding: 16, paddingBottom: 40 },
    headerCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
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
    title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8 },
    scheduleText: { fontSize: 16, color: '#4E342E' },
    descriptionCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    sectionHeader: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
    descriptionText: { fontSize: 16, color: '#333', lineHeight: 24 },
    instructionsCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    numberedContainer: { marginTop: 8 },
    numberedLine: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 6 },
    fieldRow: { marginBottom: 12 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 },
    fieldValue: { fontSize: 16, color: '#333', lineHeight: 22 },
    detailCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    thanksCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    thanksText: { fontSize: 16, color: '#333', lineHeight: 22, marginBottom: 8 },
    thanksMessage: { fontSize: 16, color: '#333', lineHeight: 22 },
    boldText: { fontWeight: '600' },
});
