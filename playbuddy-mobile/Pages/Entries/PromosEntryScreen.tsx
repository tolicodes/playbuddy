import React, { useEffect } from 'react';
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Circle } from 'react-native-svg';

import { formatDiscount } from '../Calendar/EventDetails/formatDiscount';
import { NavStack } from '../../Common/Nav/NavStackType';
import { usePromoCode } from '../../Pages/Auth/usePromoCode';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { formatDate } from '../../utils/formatDate';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../components/styles';
export const PromosEntryScreen = ({
    onPromoScreenViewed,
}: {
    onPromoScreenViewed: () => void;
}) => {
    const navigation = useNavigation<NavStack>();
    const promoCode = usePromoCode();
    const eventProps = useEventAnalyticsProps(promoCode?.featuredEvent);
    const { data: events } = useFetchEvents();

    useEffect(() => {
        if (!eventProps.event_id) {
            navigation.replace('Home');
            return;
        };

        logEvent(UE.PromoScreenViewed, eventProps);
    }, [promoCode]);

    if (!promoCode) return null; // early exit during redirect

    const { featuredPromoCode, featuredEvent, promoCodes, organizer } = promoCode;

    const fullEvent = events?.find(e => e.id === featuredEvent?.id);

    console.log('fullEvent', fullEvent)

    // Helper: copy a code to clipboard
    const copy = async (code: string) => {
        if (!eventProps.event_id) return;
        logEvent(UE.PromoScreenPromoCodeCopied, eventProps);
        await Clipboard.setStringAsync(code);
        Alert.alert('Promo Code Copied', `${code} copied to clipboard.`);
    };

    // we want to go to the community events screen but if they want
    // to go back, they will go to the home screen instead of this one
    const onClickLink = (link: 'event_details' | 'community_events') => {
        if (!eventProps.event_id) return;

        if (link === 'community_events') {
            logEvent(UE.PromoScreenExploreClicked, eventProps);

            navigation.navigate('Community Events', { communityId: organizer.communities[0].id });
        } else {
            logEvent(UE.PromoScreenEventDetailsClicked, eventProps);

            navigation.navigate('Event Details', { selectedEvent: fullEvent, title: fullEvent?.name });
        }

        onPromoScreenViewed();
    };

    if (!fullEvent) {
        console.log('no event')
        navigation.replace('Home');
        return;
    }

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Svg style={StyleSheet.absoluteFill}>
                    <Circle cx="20%" cy="10%" r="100" fill={colors.promoCircleA} />
                    <Circle cx="80%" cy="20%" r="70" fill={colors.promoCircleB} />
                    <Circle cx="30%" cy="80%" r="90" fill={colors.promoCircleC} />
                </Svg>

                <Text style={styles.title}>🎉 Welcome to PlayBuddy!</Text>
                <Text style={styles.subtitle}>As a token of appreciation</Text>
                <Text style={styles.organizer}>{organizer.name}</Text>
                <Text style={styles.subtitle}>is offering:</Text>

                <Text style={styles.discount}>{formatDiscount(featuredPromoCode)}</Text>
                <Text style={styles.productTypeMain}>{featuredPromoCode.product_type}</Text>

                {featuredEvent && (
                    <>
                        {featuredEvent.image_url && (
                            <Image
                                source={{ uri: featuredEvent.image_url }}
                                style={styles.eventBanner}
                                resizeMode="cover"
                            />
                        )}
                        <Text style={styles.featuredEventName}>{featuredEvent.name}</Text>
                        <Text style={styles.eventDate}>{formatDate(featuredEvent, true, true)}</Text>
                        <TouchableOpacity
                            style={styles.eventBtn}
                            onPress={() => onClickLink('event_details')}
                        >
                            <Text style={styles.eventBtnText}>Go to Event</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Code copy box */}
                <TouchableOpacity
                    style={styles.codeBox}
                    onPress={() => copy(featuredPromoCode.promo_code)}
                >
                    <Text style={styles.codeLabel}>Tap to copy:</Text>
                    <Text style={styles.code}>
                        {featuredPromoCode.promo_code} 📋
                    </Text>
                </TouchableOpacity>

                {/* Explore button */}
                <TouchableOpacity style={styles.exploreBtn} onPress={() => onClickLink('community_events')}>
                    <Text style={styles.exploreText}>
                        Explore {featuredEvent ? 'All' : ''} Events
                    </Text>
                </TouchableOpacity>

                {/* Render other promo codes */}
                {promoCodes.length > 0 && (
                    <>
                        <Text style={styles.sectionHeader}>Other Promos</Text>
                        {promoCodes
                            .filter((c) => c.promo_code !== featuredPromoCode.promo_code)
                            .map((item) => (
                                <View style={styles.cardWrapper} key={item.promo_code}>
                                    <TouchableOpacity style={styles.card} onPress={() => copy(item.promo_code)}>
                                        <Text style={styles.cardTitle}>{formatDiscount(item)}</Text>
                                        <Text style={styles.productTypeCard}>{item.product_type}</Text>
                                        <View style={styles.codeRow}>
                                            <Text selectable style={styles.cardCode}>
                                                {item.promo_code}
                                            </Text>
                                            <Text style={styles.copyBtn}>Copy</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.promoBackground },
    scroll: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.xxl },
    eventBanner: {
        width: '100%',
        height: 180,
        borderRadius: radius.md,
        marginVertical: spacing.smPlus,
    },
    title: {
        fontSize: fontSizes.headline,
        fontWeight: '700',
        color: colors.brandPlum,
        marginBottom: spacing.md,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        fontSize: fontSizes.xl,
        color: colors.textMuted,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    organizer: {
        fontSize: fontSizes.xxxl,
        fontWeight: '600',
        color: colors.brandLavender,
        marginVertical: spacing.sm,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
    },
    discount: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.brandPlum,
        marginTop: spacing.lg,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
    },
    productTypeMain: {
        fontSize: fontSizes.xxxl,
        fontWeight: '600',
        color: colors.brandMagenta,
        textAlign: 'center',
        marginBottom: spacing.md,
        fontFamily: fontFamilies.body,
    },
    productTypeCard: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.brandMagenta,
        marginBottom: spacing.xsPlus,
        fontFamily: fontFamilies.body,
    },
    codeBox: {
        backgroundColor: colors.promoCodeBox,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.lg,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    codeLabel: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    code: {
        fontSize: fontSizes.headline,
        fontWeight: '600',
        color: colors.brandPlum,
        backgroundColor: colors.promoCodeInner,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.md,
        overflow: 'hidden',
        fontFamily: fontFamilies.body,
    },
    exploreBtn: {
        backgroundColor: colors.brandPlum,
        borderRadius: radius.hero,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.xxxl,
        marginBottom: spacing.xl,
    },
    exploreText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    cardWrapper: {
        width: '100%',
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        alignItems: 'flex-start',
        width: '100%',
    },
    cardCode: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.brandLavender,
        flexShrink: 1,
        fontFamily: fontFamilies.body,
    },
    copyBtn: {
        color: colors.brandLavender,
        fontWeight: '600',
        marginLeft: spacing.md,
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
    },
    sectionHeader: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        color: colors.brandPlum,
        alignSelf: 'flex-start',
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.display,
    },
    cardTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '600',
        color: colors.brandPlum,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    featuredEventName: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.brandPlum,
        marginTop: spacing.md,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
    },
    eventDate: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.smPlus,
        fontFamily: fontFamilies.body,
    },
    eventBtn: {
        backgroundColor: colors.brandLavender,
        borderRadius: radius.hero,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        marginBottom: spacing.xl,
    },
    eventBtnText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
