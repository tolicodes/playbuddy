import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Markdown from '../components/Markdown';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import type { EventPopup } from '../commonTypes';
import { formatDate } from './Calendar/hooks/calendarUtils';
import { getSafeImageUrl, getSmallAvatarUrl } from '../Common/hooks/imageUtils';
import {
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../components/styles';

type EventPopupModalProps = {
    visible: boolean;
    popup: EventPopup | null;
    onDismiss: () => void;
    onPrimaryAction: () => void;
};

export function EventPopupModal({ visible, popup, onDismiss, onPrimaryAction }: EventPopupModalProps) {
    if (!visible || !popup) return null;

    const { height: windowHeight } = useWindowDimensions();
    const maxContentHeight = Math.min(windowHeight * 0.5, 420);
    const event = popup.event;
    const eventDate = event ? formatDate(event, true) : '';
    const eventLocation = event ? (event.neighborhood || event.city || event.location || '').trim() : '';
    const organizerName = event?.organizer?.name || 'Organizer';
    const eventTitle = event?.name || (popup.event_id ? `Event #${popup.event_id}` : 'Event');
    const eventMeta = [eventDate, eventLocation].filter(Boolean).join(' · ');
    const imageUrl = getSafeImageUrl(event?.image_url ? getSmallAvatarUrl(event.image_url) : undefined);
    const bodyMarkdown = popup.body_markdown ? popup.body_markdown.replace(/\n/g, '\n\n') : '';

    return (
        <Modal transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>

                    <LinearGradient
                        colors={[colors.brandPlum, colors.brandPurple, colors.brandPink]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Text style={styles.title}>{popup.title}</Text>
                    </LinearGradient>

                    <ScrollView
                        style={[styles.content, { maxHeight: maxContentHeight }]}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {bodyMarkdown ? (
                            <View style={styles.messageCard}>
                                <Markdown style={markdownStyles}>{bodyMarkdown}</Markdown>
                            </View>
                        ) : null}

                        <TouchableOpacity style={styles.eventCard} onPress={onPrimaryAction} activeOpacity={0.9}>
                            <View style={styles.eventImageWrap}>
                                {imageUrl ? (
                                    <Image
                                        source={{ uri: imageUrl }}
                                        style={styles.eventImage}
                                        contentFit="cover"
                                        cachePolicy="disk"
                                        allowDownscaling
                                        decodeFormat="rgb"
                                    />
                                ) : (
                                    <View style={styles.imageFallback}>
                                        <FontAwesome5 name="calendar-alt" size={28} color={colors.textOnDarkMuted} />
                                    </View>
                                )}
                                <LinearGradient
                                    colors={[colors.overlayNone, colors.overlayHero]}
                                    style={styles.imageGradient}
                                />
                            </View>
                            <View style={styles.eventBody}>
                                <Text style={styles.eventTitle} numberOfLines={2}>
                                    {eventTitle}
                                </Text>
                                <Text style={styles.eventOrganizer} numberOfLines={1}>
                                    {organizerName}
                                </Text>
                                {!!eventMeta && (
                                    <Text style={styles.eventMeta} numberOfLines={2}>
                                        {eventMeta}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryAction}>
                            <Text style={styles.primaryButtonText}>Check it out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss}>
                            <Text style={styles.secondaryButtonText}>Not now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.backdropNight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '92%',
        maxHeight: '90%',
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderNight,
        ...shadows.card,
    },
    closeButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlassStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontFamily: fontFamilies.body,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.mdPlus,
    },
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        color: colors.white,
        lineHeight: lineHeights.xl,
        fontFamily: fontFamilies.display,
    },
    content: {
        alignSelf: 'stretch',
    },
    contentContainer: {
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing.mdPlus,
    },
    messageCard: {
        borderRadius: radius.mdPlus,
        backgroundColor: colors.surfaceNightOverlay,
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
        padding: spacing.mdPlus,
    },
    eventCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surfaceNightOverlay,
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
    },
    eventImageWrap: {
        height: 140,
        backgroundColor: colors.brandPlum,
    },
    eventImage: {
        width: '100%',
        height: '100%',
    },
    imageFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.heroDark,
    },
    imageGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    eventBody: {
        padding: spacing.mdPlus,
    },
    eventTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.display,
    },
    eventOrganizer: {
        fontSize: fontSizes.base,
        color: colors.textNightMuted,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    eventMeta: {
        fontSize: fontSizes.smPlus,
        color: colors.textNightSubtle,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    footer: {
        padding: spacing.mdPlus,
        gap: spacing.smPlus,
        borderTopWidth: 1,
        borderTopColor: colors.borderNight,
        backgroundColor: colors.surfaceNight,
    },
    primaryButton: {
        backgroundColor: colors.accentSky,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.smPlus,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: colors.surfaceNight,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    secondaryButton: {
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.smPlus,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
    },
    secondaryButtonText: {
        color: colors.textNightMuted,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});

const markdownStyles = {
    body: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
    },
    paragraph: {
        marginBottom: spacing.md,
        color: colors.textNight,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
    },
    heading1: {
        color: colors.white,
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    heading2: {
        color: colors.textNight,
        fontSize: fontSizes.xl,
        fontWeight: '700',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    bullet_list: {
        marginBottom: spacing.md,
    },
    list_item: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
        marginBottom: spacing.xs,
    },
    strong: {
        color: colors.white,
        fontWeight: '700',
    },
    link: {
        color: colors.accentSky,
    },
};
