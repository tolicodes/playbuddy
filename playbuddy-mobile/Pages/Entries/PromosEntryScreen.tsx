import React, { useEffect, useMemo } from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

import { formatDiscount } from '../Calendar/EventDetails/formatDiscount';
import { NavStack } from '../../Common/Nav/NavStackType';
import { usePromoCode } from '../../Pages/Auth/usePromoCode';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { navigateToHome } from '../../Common/Nav/navigationHelpers';
import { formatDate } from '../../utils/formatDate';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { colors, fontFamilies, fontSizes, gradients, lineHeights, radius, shadows, spacing } from '../../components/styles';
export const PromosEntryScreen = ({
    onPromoScreenViewed,
}: {
    onPromoScreenViewed: () => void;
}) => {
    const navigation = useNavigation<NavStack>();
    const promoCode = usePromoCode();
    const { data: events } = useFetchEvents();
    const featuredEvent = promoCode?.featuredEvent;

    const fullEvent = useMemo(
        () => events?.find(e => e.id === featuredEvent?.id),
        [events, featuredEvent?.id],
    );
    const eventForDetails = fullEvent ?? featuredEvent;
    const eventProps = useEventAnalyticsProps(eventForDetails);

    useEffect(() => {
        if (!promoCode) return;
        logEvent(UE.PromoScreenViewed, eventProps);
    }, [promoCode]);

    if (!promoCode) return null; // early exit during redirect

    const { featuredPromoCode, promoCodes, organizer } = promoCode;
    const organizerName = organizer?.name || 'PlayBuddy';
    const otherPromos = promoCodes.filter((c) => c.promo_code !== featuredPromoCode.promo_code);

    // Helper: copy a code to clipboard
    const copy = async (code: string) => {
        logEvent(UE.PromoScreenPromoCodeCopied, eventProps);
        await Clipboard.setStringAsync(code);
        Alert.alert('Promo Code Copied', `${code} copied to clipboard.`);
    };

    // we want to go to the community events screen but if they want
    // to go back, they will go to the home screen instead of this one
    const onClickLink = (link: 'event_details' | 'community_events') => {
        onPromoScreenViewed();

        if (link === 'community_events') {
            logEvent(UE.PromoScreenExploreClicked, eventProps);
            const communityId = organizer?.communities?.[0]?.id;
            if (!communityId) {
                navigateToHome(navigation);
                return;
            }
            navigation.replace('Community Events', { communityId });
            return;
        }

        if (!eventForDetails) return;
        logEvent(UE.PromoScreenEventDetailsClicked, eventProps);
        navigation.replace('Event Details', { selectedEvent: eventForDetails, title: eventForDetails?.name });
    };

    return (
        <LinearGradient
            colors={gradients.welcome}
            locations={[0, 0.4, 0.75, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.gradient}
        >
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowMid} />
            <View pointerEvents="none" style={styles.glowBottom} />
            <SafeAreaView style={styles.safe}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.heroCard}>
                        <Text style={styles.kicker}>PlayBuddy Invite</Text>
                        <Text style={styles.title}>A gift from</Text>
                        <Text style={styles.organizerName}>{organizerName}</Text>
                        <Text style={styles.subtitle}>
                            Unlock exclusive perks for your next event and keep the magic going.
                        </Text>
                    </View>

                    <LinearGradient
                        colors={[colors.surfaceWhiteOpaque, colors.surfaceLavenderWarm]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.offerCard}
                    >
                        <View style={styles.offerBadge}>
                            <Text style={styles.offerBadgeText}>Exclusive offer</Text>
                        </View>
                        <Text style={styles.offerValue}>{formatDiscount(featuredPromoCode)}</Text>
                        <Text style={styles.offerType}>{featuredPromoCode.product_type}</Text>

                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => copy(featuredPromoCode.promo_code)}
                            style={styles.codePillWrap}
                        >
                            <LinearGradient
                                colors={[colors.surfaceGoldWarm, colors.surfaceLavenderLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.codePill}
                            >
                                <Text style={styles.codeLabel}>Tap to copy</Text>
                                <View style={styles.codeRow}>
                                    <Text style={styles.codeText}>{featuredPromoCode.promo_code}</Text>
                                    <View style={styles.codeAction}>
                                        <Text style={styles.codeActionText}>Copy</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>

                    {eventForDetails && (
                        <View style={styles.eventCard}>
                            {eventForDetails.image_url && (
                                <Image
                                    source={{ uri: eventForDetails.image_url }}
                                    style={styles.eventBanner}
                                    resizeMode="cover"
                                />
                            )}
                            <View style={styles.eventInfo}>
                                <Text style={styles.eventTag}>Featured event</Text>
                                <Text style={styles.featuredEventName}>{eventForDetails.name}</Text>
                                <Text style={styles.eventDate}>{formatDate(eventForDetails, true, true)}</Text>
                                <TouchableOpacity activeOpacity={0.9} onPress={() => onClickLink('event_details')}>
                                    <LinearGradient
                                        colors={gradients.primaryButton}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.eventBtn}
                                    >
                                        <Text style={styles.eventBtnText}>Go to Event</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity activeOpacity={0.9} onPress={() => onClickLink('community_events')}>
                        <LinearGradient
                            colors={gradients.nav}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.exploreBtn}
                        >
                            <Text style={styles.exploreText}>
                                {eventForDetails ? 'Explore all events' : 'Explore events'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {otherPromos.length > 0 && (
                        <>
                            <Text style={styles.sectionHeader}>More perks</Text>
                            {otherPromos.map((item) => (
                                <TouchableOpacity
                                    key={item.promo_code}
                                    activeOpacity={0.9}
                                    style={styles.promoCard}
                                    onPress={() => copy(item.promo_code)}
                                >
                                    <View style={styles.promoAccent} />
                                    <View style={styles.promoContent}>
                                        <Text style={styles.cardTitle}>{formatDiscount(item)}</Text>
                                        <Text style={styles.productTypeCard}>{item.product_type}</Text>
                                        <View style={styles.codeRow}>
                                            <Text selectable style={styles.cardCode}>
                                                {item.promo_code}
                                            </Text>
                                            <Text style={styles.copyBtn}>Copy</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    glowTop: {
        position: 'absolute',
        top: -70,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: colors.brandGlowTop,
    },
    glowMid: {
        position: 'absolute',
        top: 150,
        left: -110,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowMid,
    },
    glowBottom: {
        position: 'absolute',
        bottom: -90,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.brandGlowWarm,
    },
    safe: {
        flex: 1,
    },
    scroll: {
        paddingTop: spacing.xxxl,
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.xxxl,
    },
    heroCard: {
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.xl,
        padding: spacing.xxl,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        ...shadows.brandCard,
    },
    kicker: {
        fontSize: fontSizes.smPlus,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: colors.brandLavender,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.brandPlum,
        fontFamily: fontFamilies.display,
    },
    organizerName: {
        fontSize: fontSizes.displayLg,
        fontWeight: '700',
        color: colors.brandPlum,
        marginTop: spacing.xsPlus,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        fontSize: fontSizes.xl,
        color: colors.brandTextMuted,
        marginTop: spacing.sm,
        lineHeight: lineHeights.lg,
        fontFamily: fontFamilies.body,
    },
    offerCard: {
        borderRadius: radius.xl,
        padding: spacing.xxl,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        marginTop: spacing.xl,
        ...shadows.brandCard,
    },
    offerBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.badgeBackground,
        borderColor: colors.badgeBorder,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    offerBadgeText: {
        fontSize: fontSizes.xsPlus,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.brandPurple,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    offerValue: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.brandPlum,
        fontFamily: fontFamilies.display,
    },
    offerType: {
        fontSize: fontSizes.xxl,
        fontWeight: '600',
        color: colors.brandMagenta,
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    codePillWrap: {
        borderRadius: radius.lgPlus,
        overflow: 'hidden',
    },
    codePill: {
        borderRadius: radius.lgPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    codeLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    codeText: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.brandPlum,
        fontFamily: fontFamilies.display,
    },
    codeAction: {
        backgroundColor: colors.brandPlum,
        borderRadius: radius.pill,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    codeActionText: {
        color: colors.white,
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    eventCard: {
        marginTop: spacing.xl,
        borderRadius: radius.xl,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        overflow: 'hidden',
        ...shadows.card,
    },
    eventBanner: {
        width: '100%',
        height: 190,
    },
    eventInfo: {
        padding: spacing.lg,
    },
    eventTag: {
        fontSize: fontSizes.xsPlus,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.textLavenderMuted,
        fontFamily: fontFamilies.body,
    },
    featuredEventName: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.brandPlum,
        marginTop: spacing.xsPlus,
        fontFamily: fontFamilies.display,
    },
    eventDate: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        marginTop: spacing.xs,
        marginBottom: spacing.md,
        fontFamily: fontFamilies.body,
    },
    eventBtn: {
        borderRadius: radius.pill,
        paddingVertical: spacing.md,
        alignItems: 'center',
        ...shadows.button,
    },
    eventBtnText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    exploreBtn: {
        borderRadius: radius.hero,
        paddingVertical: spacing.mdPlus,
        alignItems: 'center',
        marginTop: spacing.lg,
        ...shadows.button,
    },
    exploreText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        textTransform: 'capitalize',
    },
    sectionHeader: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        color: colors.brandPlum,
        marginTop: spacing.xxl,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    promoCard: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lgPlus,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        marginBottom: spacing.md,
        ...shadows.card,
    },
    promoAccent: {
        width: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.brandPink,
        marginRight: spacing.md,
    },
    promoContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '600',
        color: colors.brandPlum,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.display,
    },
    productTypeCard: {
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        color: colors.brandMagenta,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    cardCode: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.brandLavender,
        flexShrink: 1,
        fontFamily: fontFamilies.body,
    },
    copyBtn: {
        color: colors.linkAccent,
        fontWeight: '600',
        marginLeft: spacing.md,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
    },
});
