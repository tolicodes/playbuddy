import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';

import type { EventWithMetadata } from '../../Common/Nav/NavStackType';
import type { Attendee } from '../../commonTypes';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../Common/types/userEventTypes';
import { EventListItem, ITEM_HEIGHT } from '../Calendar/ListView/EventListItem';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../config';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../../components/styles';
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from '../../Common/types/commonTypes';

const emptyAttendees: Attendee[] = [];
const DISCOVER_CARD_HEIGHT = ITEM_HEIGHT + spacing.xxxl;

type DiscoverEventsCardProps = {
    event: EventWithMetadata;
    isEventSourceExcluded?: (event: EventWithMetadata) => boolean;
};

export const DiscoverEventsCard: React.FC<DiscoverEventsCardProps> = ({ event, isEventSourceExcluded }) => {
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const description = (event.short_description || '').trim();
    const ticketUrl = event.event_url || event.ticket_url;
    const isKnownEventType = (value?: string | null) =>
        !!value && (value === FALLBACK_EVENT_TYPE || ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]));
    const adminLines = useMemo(() => {
        if (!isAdmin) return [];
        const classification = event.classification;
        const tags = [
            ...(event.tags || []),
            ...(classification?.tags || []),
        ].map(tag => tag.trim()).filter(Boolean);
        const inclusivity = classification?.inclusivity?.filter(Boolean) || [];
        const lines: Array<{ label: string; value: string }> = [];
        const typeValue = event.play_party ? 'play_party' : event.is_munch ? 'munch' : event.type;
        if (typeValue) {
            const label = typeValue.replace(/_/g, ' ');
            lines.push({
                label: 'Type',
                value: isKnownEventType(typeValue) ? label : `${label} (legacy)`,
            });
        }
        if (tags.length) lines.push({ label: 'Tags', value: tags.join(', ') });
        if (classification?.experience_level) {
            lines.push({ label: 'Experience', value: classification.experience_level });
        }
        if (classification?.interactivity_level) {
            lines.push({ label: 'Interactivity', value: classification.interactivity_level });
        }
        if (inclusivity.length) {
            lines.push({ label: 'Inclusivity', value: inclusivity.join(', ') });
        }
        const organizerVetted = event.organizer?.vetted;
        const effectiveVetted = classification?.vetted ?? event.vetted ?? organizerVetted;
        if (effectiveVetted != null) {
            const vettedValue = effectiveVetted ? 'yes' : 'no';
            lines.push({ label: 'Vetted', value: vettedValue });
        }
        if (event.approval_status) {
            lines.push({ label: 'Approval', value: event.approval_status });
        }
        if (event.hidden != null) {
            lines.push({ label: 'Hidden', value: event.hidden ? 'yes' : 'no' });
        }
        return lines;
    }, [event, isAdmin]);

    const handleMoreInfo = useCallback(() => {
        if (!ticketUrl) return;
        Linking.openURL(ticketUrl);
        logEvent(UE.DiscoverEventsMoreInfoClicked, { event_id: event.id });
    }, [event.id, ticketUrl]);

    const footerContent = description || ticketUrl ? (
        <View>
            <View style={styles.footerDivider} />
            {description ? (
                <Text style={styles.description} numberOfLines={4}>
                    {description}
                </Text>
            ) : null}
            {ticketUrl ? (
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={handleMoreInfo}
                    activeOpacity={0.85}
                >
                    <Text style={styles.ctaText}>Get Tickets</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    ) : null;

    return (
        <View style={styles.wrapper}>
            <EventListItem
                item={event}
                onPress={handleMoreInfo}
                attendees={emptyAttendees}
                autoHeight
                listViewMode="image"
                cardVariant="type-icon"
                isAdmin={isAdmin}
                isEventSourceExcluded={isEventSourceExcluded}
                cardHeight={DISCOVER_CARD_HEIGHT}
                footerContent={footerContent ?? undefined}
                hideSaveButton
            />
            {adminLines.length ? (
                <View style={styles.adminSection}>
                    <Text style={styles.adminHeading}>Admin details</Text>
                    <ScrollView
                        style={styles.adminScroll}
                        contentContainerStyle={styles.adminScrollContent}
                        showsVerticalScrollIndicator
                    >
                        {adminLines.map(line => (
                            <Text key={line.label} style={styles.adminLine}>
                                <Text style={styles.adminLabel}>{line.label}:</Text> {line.value}
                            </Text>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
    },
    description: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.md,
        textAlign: 'left',
    },
    footerDivider: {
        height: 2,
        backgroundColor: colors.borderLavenderStrong,
        marginBottom: spacing.mdPlus,
        borderRadius: 1,
    },
    adminSection: {
        marginTop: spacing.mdPlus,
        marginBottom: spacing.mdPlus,
    },
    adminHeading: {
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xs,
    },
    adminScroll: {
        maxHeight: 96,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        backgroundColor: colors.surfaceLavenderLight,
    },
    adminScrollContent: {
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.sm,
    },
    adminLine: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        lineHeight: lineHeights.sm,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xs,
    },
    adminLabel: {
        fontWeight: '700',
        color: colors.textPrimary,
    },
    ctaButton: {
        backgroundColor: colors.brandBright,
        borderRadius: radius.hero,
        paddingVertical: spacing.md,
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    ctaText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
