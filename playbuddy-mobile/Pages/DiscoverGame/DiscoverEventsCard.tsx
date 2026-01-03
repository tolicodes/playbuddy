// DiscoverEventsCard.tsx

import React, { useCallback } from 'react';
import {
    View,
    Text,
    Image as RNImage,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

import { formatDate } from '../Calendar/hooks/calendarUtils';
import { getSmallAvatarUrl } from '../../Common/hooks/imageUtils';
import { logEvent } from '../../Common/hooks/logger';
import type { Event } from '../../commonTypes';
import { BadgeRow } from '../../components/EventBadgesRow';
import { UE } from '../../Common/types/userEventTypes';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../../components/styles';

export const CARD_HEIGHT = 500;
const IMAGE_HEIGHT = CARD_HEIGHT * 0.4;
const DATE_PILL_HEIGHT = 28; // adjust if font/padding changes

/** ─── CardWrapper ──────────────────────────────────────────────────────────── */
const CardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={cardWrapperStyles.container}>{children}</View>
);

const cardWrapperStyles = StyleSheet.create({
    container: {
        width: '100%',
        height: CARD_HEIGHT,
        borderRadius: radius.md,
        backgroundColor: colors.white,
        marginBottom: spacing.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
        elevation: 24,
        position: 'relative',
    },
});

/** ─── CardImage ────────────────────────────────────────────────────────────── */
const CardImage: React.FC<{ uri?: string }> = ({ uri }) => (
    <RNImage source={uri ? { uri } : undefined} style={cardImageStyles.image} />
);

const cardImageStyles = StyleSheet.create({
    image: {
        width: '100%',
        height: IMAGE_HEIGHT,
        resizeMode: 'cover',
    },
});

/** ─── DatePill ─────────────────────────────────────────────────────────────── */
const DatePill: React.FC<{ date: string }> = ({ date }) => (
    <View style={datePillStyles.container}>
        <Icon name="event" size={16} color={colors.white} />
        <Text style={datePillStyles.text}>  {date}</Text>
    </View>
);

const datePillStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: IMAGE_HEIGHT - DATE_PILL_HEIGHT / 2,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.brandBright,
        borderRadius: radius.md,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.lg,
        height: DATE_PILL_HEIGHT,
    },
    text: {
        color: colors.white,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});

/** ─── CardContent ──────────────────────────────────────────────────────────── */
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={cardContentStyles.container}>{children}</View>
);

const cardContentStyles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: DATE_PILL_HEIGHT / 2 + spacing.lg, // push content below pill
        paddingBottom: spacing.lg,
        justifyContent: 'space-between',
    },
});

/** ─── TimeLine ─────────────────────────────────────────────────────────────── */
const TimeLine: React.FC<{ date: string }> = ({ date }) => (
    <Text style={timeLineStyles.text}>{date}</Text>
);

const timeLineStyles = StyleSheet.create({
    text: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: spacing.sm,
        fontFamily: fontFamilies.body,
    },
});

/** ─── Title ─────────────────────────────────────────────────────────────────── */
const Title: React.FC<{ text: string }> = ({ text }) => (
    <Text style={titleStyles.text} numberOfLines={2}>
        {text}
    </Text>
);

const titleStyles = StyleSheet.create({
    text: {
        fontSize: fontSizes.xxxl,
        fontWeight: '600',
        color: colors.textDeep,
        textAlign: 'center',
        marginTop: spacing.md,
        fontFamily: fontFamilies.display,
    },
});

/** ─── Subtitle ──────────────────────────────────────────────────────────────── */
const Subtitle: React.FC<{ text?: string }> = ({ text }) =>
    text ? (
        <Text style={subtitleStyles.text} numberOfLines={1}>
            {text}
        </Text>
    ) : null;

const subtitleStyles = StyleSheet.create({
    text: {
        fontSize: fontSizes.xl,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xs,
        marginBottom: spacing.md,
        fontFamily: fontFamilies.body,
    },
});

/** ─── PromoBadge ────────────────────────────────────────────────────────────── */
const PromoBadge: React.FC<{ label: string }> = ({ label }) => (
    <View style={promoBadgeStyles.container}>
        <Text style={promoBadgeStyles.text}>{label}</Text>
    </View>
);

const promoBadgeStyles = StyleSheet.create({
    container: {
        backgroundColor: colors.gold,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        alignSelf: 'center',
        marginVertical: spacing.sm,
    },
    text: {
        fontSize: fontSizes.sm,
        fontWeight: 'bold',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
});

/** ─── Description ───────────────────────────────────────────────────────────── */
const Description: React.FC<{ text: string }> = ({ text }) => (
    <Text style={descriptionStyles.text} numberOfLines={3}>
        {text}
    </Text>
);

const descriptionStyles = StyleSheet.create({
    text: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        lineHeight: lineHeights.md,
        marginVertical: spacing.sm,
        fontFamily: fontFamilies.body,
    },
});

/** ─── CTAButton ─────────────────────────────────────────────────────────────── */
const CTAButton: React.FC<{ label: string; onPress: () => void }> = ({
    label,
    onPress,
}) => (
    <TouchableOpacity style={ctaButtonStyles.container} onPress={onPress}>
        <Text style={ctaButtonStyles.text}>{label}</Text>
    </TouchableOpacity>
);

const ctaButtonStyles = StyleSheet.create({
    container: {
        backgroundColor: colors.brandBright,
        borderRadius: radius.hero,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    text: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});

/** ─── DiscoverEventsCard ───────────────────────────────────────────────────── */
interface DiscoverEventsCardProps {
    event: Event;
}

export const DiscoverEventsCard: React.FC<DiscoverEventsCardProps> = ({
    event,
}) => {
    const day = moment(event.start_date).format('dddd').toUpperCase();
    const time = `${moment(event.start_date).format('MMM D')} · ${formatDate(
        event
    )}`;

    const promo =
        event.promo_codes?.find((c) => c.scope === 'event') ||
        event.organizer?.promo_codes?.find((c) => c.scope === 'organizer');
    const description = event.short_description || '';

    const handleMoreInfo = useCallback(() => {
        if (!event.event_url) return;
        Linking.openURL(event.event_url);
        logEvent(UE.DiscoverEventsMoreInfoClicked, { event_id: event.id });
    }, [event]);

    const promoLabel = promo
        ? promo.discount_type === 'percent'
            ? `${promo.discount}% off`
            : `$${promo.discount} off`
        : undefined;

    return (
        <CardWrapper>
            {event.image_url && <CardImage uri={getSmallAvatarUrl(event.image_url)} />}

            {/* Date pill overlapping image & content */}
            <DatePill date={day} />

            <CardContent>
                {/* Top section: time + title/subtitle + promo + description */}
                <View>
                    <TimeLine date={time} />
                    <Title text={event.name} />
                    <Subtitle text={event.organizer?.name} />

                    {promoLabel && <PromoBadge label={promoLabel} />}

                    <BadgeRow center={true} vetted={event.vetted} playParty={event.play_party} />

                    {description && <Description text={description} />}
                </View>

                {/* Bottom (CTA) */}
                <CTAButton label="Get Tickets" onPress={handleMoreInfo} />
            </CardContent>
        </CardWrapper>
    );
};
