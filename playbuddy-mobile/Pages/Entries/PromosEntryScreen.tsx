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
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import { formatDiscount } from '../Calendar/EventDetails/formatDiscount';
import { NavStack } from '../../Common/Nav/NavStackType';
import { usePromoCode } from '../../Pages/Auth/usePromoCode';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { navigateToHome } from '../../Common/Nav/navigationHelpers';
import { formatDate } from '../../utils/formatDate';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { useFetchMyCommunities, useJoinCommunity } from '../../Common/hooks/useCommunities';
import { promptOrganizerNotificationsIfNeeded } from '../../Common/notifications/organizerPushNotifications';
import { colors, fontFamilies, fontSizes, gradients, lineHeights, radius, shadows, spacing } from '../../components/styles';

const logoMark = require('../../assets/logo-transparent.png');
const isUuid = (value?: string) =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const PromosEntryScreen = ({
    onPromoScreenViewed,
}: {
    onPromoScreenViewed: () => void;
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId } = useUserContext();
    const promoCode = usePromoCode();
    const { data: events = [] } = useFetchEvents();
    const { data: myCommunities = [] } = useFetchMyCommunities();
    const joinCommunity = useJoinCommunity();
    const featuredEvent = promoCode?.featuredEvent;
    const organizerId = promoCode?.organizer?.id?.toString();
    const organizerIdsFromCommunities = useMemo(
        () =>
            myCommunities
                .map((community) => community.organizer_id)
                .filter((id): id is string => Boolean(id))
                .map((id) => id.toString()),
        [myCommunities]
    );

    const fullEvent = useMemo(
        () => events?.find(e => e.id === featuredEvent?.id),
        [events, featuredEvent?.id],
    );
    const eventForDetails = fullEvent ?? featuredEvent;
    const organizerEvents = useMemo(() => {
        if (!events || !promoCode?.organizer) return [];
        const matchId = promoCode.organizer?.id?.toString();
        const matchName = promoCode.organizer?.name?.trim().toLowerCase();
        return events
            .filter((event) => {
                const eventOrganizer = event.organizer;
                if (!eventOrganizer) return false;
                if (matchId && eventOrganizer.id?.toString() === matchId) return true;
                if (matchName && eventOrganizer.name?.toLowerCase() === matchName) return true;
                return false;
            })
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [events, promoCode?.organizer?.id, promoCode?.organizer?.name]);
    const upcomingEvents = useMemo(() => {
        if (!organizerEvents.length) return [];
        const now = Date.now();
        const futureEvents = organizerEvents.filter((event) => {
            const startTime = new Date(event.start_date).getTime();
            if (Number.isNaN(startTime)) return false;
            return startTime >= now;
        });
        const list = futureEvents.length > 0 ? futureEvents : organizerEvents;
        return list.slice(0, 3);
    }, [organizerEvents]);
    const organizerCommunityIds = useMemo(() => {
        const communityIdSet = new Set<string>();
        const addCommunityId = (id?: string) => {
            if (id) communityIdSet.add(id);
        };
        const matchName = promoCode?.organizer?.name?.trim().toLowerCase();

        promoCode?.organizer?.communities?.forEach((community) => {
            if (!organizerId || community.organizer_id?.toString() === organizerId) {
                addCommunityId(community.id);
            }
        });

        for (const event of events || []) {
            const organizerMatch = organizerId
                ? event.organizer?.id?.toString() === organizerId
                : matchName && event.organizer?.name?.trim().toLowerCase() === matchName;
            if (!organizerMatch) continue;
            for (const community of event.communities || []) {
                if (organizerId) {
                    if (community.organizer_id?.toString() === organizerId) {
                        addCommunityId(community.id);
                    }
                } else if (community.organizer_id) {
                    addCommunityId(community.id);
                }
            }
        }

        return Array.from(communityIdSet);
    }, [events, organizerId, promoCode?.organizer?.communities, promoCode?.organizer?.name]);
    const joinableCommunityIds = useMemo(
        () => organizerCommunityIds.filter((id) => isUuid(id)),
        [organizerCommunityIds]
    );
    const eventProps = useEventAnalyticsProps(eventForDetails);

    useEffect(() => {
        if (!promoCode) return;
        logEvent(UE.PromoScreenViewed, eventProps);
    }, [promoCode]);

    if (!promoCode) return null; // early exit during redirect

    const { featuredPromoCode, promoCodes, organizer } = promoCode;
    const organizerName = organizer?.name || 'PlayBuddy';
    const otherPromos = promoCodes.filter((c) => c.promo_code !== featuredPromoCode.promo_code);
    const exploreLabel = 'Explore Events';
    const communityIds = joinableCommunityIds.length ? joinableCommunityIds : undefined;

    // Helper: copy a code to clipboard
    const copy = async (code: string) => {
        logEvent(UE.PromoScreenPromoCodeCopied, eventProps);
        await Clipboard.setStringAsync(code);
        Alert.alert('Promo Code Copied', `${code} copied to clipboard.`);
    };

    const handleOrganizerNavigate = () => {
        onPromoScreenViewed();
        logEvent(UE.PromoScreenExploreClicked, eventProps);

        if (authUserId && joinableCommunityIds.length > 0) {
            const myCommunityIds = new Set(myCommunities.map((community) => community.id));
            joinableCommunityIds
                .filter((id) => !myCommunityIds.has(id))
                .forEach((communityId) => {
                    joinCommunity.mutate({
                        community_id: communityId,
                        type: 'organizer_public_community',
                    });
                });
            const nextFollowedOrganizerIds = new Set(organizerIdsFromCommunities);
            if (organizerId) {
                nextFollowedOrganizerIds.add(organizerId);
            }
            void promptOrganizerNotificationsIfNeeded({
                events,
                followedOrganizerIds: nextFollowedOrganizerIds,
            });
        }

        const communityId =
            joinableCommunityIds[0] ||
            organizerCommunityIds[0] ||
            organizer?.communities?.[0]?.id ||
            organizerId;
        if (!communityId) {
            navigateToHome(navigation);
            return;
        }

        navigation.replace('Community Events', {
            communityId,
            communityIds,
            displayName: organizerName,
            organizerId,
        });
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
                    <View style={styles.hero}>
                        <View style={styles.logoHalo}>
                            <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                        </View>
                        <Text style={styles.title}>Welcome to PlayBuddy</Text>
                        <Text style={styles.subtitle}>Find your people</Text>
                    </View>

                    <LinearGradient
                        colors={[colors.white, colors.surfaceLavenderLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.offerCard}
                    >
                        <Text style={styles.giftLine} numberOfLines={1} ellipsizeMode="tail">
                            A gift from <Text style={styles.giftName}>{organizerName}</Text>
                        </Text>

                        <View style={styles.offerRow}>
                            <View style={styles.offerColumn}>
                                <Text
                                    style={styles.offerDiscount}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {formatDiscount(featuredPromoCode)}
                                </Text>
                                <Text style={styles.offerCaption}>any event</Text>
                            </View>
                            <View style={styles.offerDivider} />
                            <View style={styles.offerCodeColumn}>
                                <Text style={styles.offerCode} numberOfLines={1} ellipsizeMode="tail">
                                    {featuredPromoCode.promo_code}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => copy(featuredPromoCode.promo_code)}
                                    style={styles.copyButton}
                                >
                                    <Text style={styles.copyButtonText}>Copy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>

                    <TouchableOpacity activeOpacity={0.9} onPress={handleOrganizerNavigate} style={styles.exploreButton}>
                        <LinearGradient
                            colors={gradients.primaryButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.exploreGradient}
                        >
                            <FAIcon name="compass" size={18} color={colors.white} style={styles.exploreIcon} />
                            <Text style={styles.exploreText}>{exploreLabel}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {upcomingEvents.length > 0 && (
                        <View style={styles.eventsCard}>
                            <Text style={styles.eventsHeader}>Upcoming Events</Text>
                            {upcomingEvents.map((event, index) => (
                                <TouchableOpacity
                                    key={event.id}
                                    activeOpacity={0.9}
                                    onPress={handleOrganizerNavigate}
                                    style={[
                                        styles.eventRow,
                                        index === upcomingEvents.length - 1 && styles.eventRowLast,
                                    ]}
                                >
                                    {event.image_url ? (
                                        <Image
                                            source={{ uri: event.image_url }}
                                            style={styles.eventThumb}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.eventThumbFallback}>
                                            <FAIcon name="calendar-alt" size={16} color={colors.brandLavender} />
                                        </View>
                                    )}
                                    <View style={styles.eventRowCopy}>
                                        <Text style={styles.eventRowTitle} numberOfLines={2}>
                                            {event.name}
                                        </Text>
                                        <Text style={styles.eventRowMeta}>{formatDate(event, true, true)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

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
        flexGrow: 1,
        alignItems: 'center',
    },
    hero: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoHalo: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.mdPlus,
    },
    logo: {
        width: 50,
        height: 50,
    },
    title: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.white,
        textAlign: 'center',
        marginBottom: 0,
        fontFamily: fontFamilies.display,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.textOnDarkMuted,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
        maxWidth: 300,
        lineHeight: lineHeights.lg,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
    },
    offerCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: radius.hero,
        padding: spacing.lgPlus,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        alignItems: 'center',
        marginBottom: spacing.sm,
        ...shadows.brandCard,
        elevation: 8,
    },
    giftLine: {
        fontSize: fontSizes.basePlus,
        color: colors.brandTextMuted,
        lineHeight: 28,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
        alignSelf: 'stretch',
        paddingHorizontal: spacing.sm,
    },
    giftName: {
        fontWeight: '700',
        color: colors.brandPlum,
        fontFamily: fontFamilies.display,
        fontSize: fontSizes.headline,
    },
    offerRow: {
        alignSelf: 'stretch',
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-between',
    },
    offerColumn: {
        flex: 1.2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offerDiscount: {
        fontSize: fontSizes.displayLg,
        fontWeight: '700',
        color: colors.brandMagenta,
        fontFamily: fontFamilies.display,
    },
    offerCaption: {
        fontSize: fontSizes.xsPlus,
        color: colors.textLavenderMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xxs,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    offerDivider: {
        width: 1,
        backgroundColor: colors.borderLavenderSoft,
        marginHorizontal: spacing.md,
        alignSelf: 'stretch',
    },
    offerCode: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.brandPlum,
        fontFamily: fontFamilies.display,
        letterSpacing: 0.4,
        flexShrink: 1,
    },
    offerCodeColumn: {
        flex: 0.8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyButton: {
        backgroundColor: colors.brandBright,
        borderRadius: radius.pill,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
    },
    copyButtonText: {
        color: colors.white,
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    eventsCard: {
        width: '100%',
        maxWidth: 360,
        marginTop: spacing.lg,
        borderRadius: radius.hero,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        padding: spacing.lg,
        ...shadows.card,
    },
    eventsHeader: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.brandPlum,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLavenderSoft,
    },
    eventThumb: {
        width: 56,
        height: 56,
        borderRadius: radius.md,
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    eventThumbFallback: {
        width: 56,
        height: 56,
        borderRadius: radius.md,
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        backgroundColor: colors.surfaceLavenderLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    eventRowCopy: {
        flex: 1,
    },
    eventRowTitle: {
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        color: colors.brandPlum,
        fontFamily: fontFamilies.display,
    },
    eventRowMeta: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    exploreButton: {
        width: '100%',
        maxWidth: 360,
        borderRadius: radius.hero,
        overflow: 'hidden',
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        ...shadows.button,
    },
    exploreGradient: {
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.hero,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exploreIcon: {
        marginRight: spacing.sm,
    },
    exploreText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        letterSpacing: 0.2,
    },
    sectionHeader: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        color: colors.white,
        marginTop: spacing.xxl,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
        width: '100%',
        maxWidth: 360,
    },
    promoCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: radius.lgPlus,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        marginBottom: spacing.md,
        width: '100%',
        maxWidth: 360,
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
