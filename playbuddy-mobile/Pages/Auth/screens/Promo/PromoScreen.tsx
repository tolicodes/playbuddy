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

import { formatDiscount } from '../../../Calendar/PromoCode';
import { NavStack } from '../../../../Common/Nav/NavStackType';
import { usePromoCode } from '../usePromoCode';
import { formatDate } from '../../../Calendar/hooks/calendarUtils';
import { getAnalyticsPropsDeepLink, getAnalyticsPropsEvent, logEvent } from '../../../../Common/hooks/logger';
import { UE } from '../../../../userEventTypes';
import { useUserContext } from '../../hooks/UserContext';

export const PromoScreen = ({
    onPromoScreenViewed,
}: {
    onPromoScreenViewed: () => void;
}) => {
    const navigation = useNavigation<NavStack>();
    const promoCode = usePromoCode();
    const { authUserId } = useUserContext();
    useEffect(() => {
        if (!promoCode) {
            navigation.replace('Home');
            return;
        };
        logEvent(UE.PromoScreenViewed, {
            ...getAnalyticsPropsDeepLink(promoCode.deepLink),
            ...getAnalyticsPropsEvent(featuredEvent),
            auth_user_id: authUserId,
            has_promo: !!featuredPromoCode,
        });
    }, [promoCode]);

    if (!promoCode) return null; // early exit during redirect

    const { featuredPromoCode, featuredEvent, promoCodes, organizer } = promoCode;

    // Helper: copy a code to clipboard
    const copy = async (code: string) => {
        logEvent(UE.PromoScreenPromoCodeCopied, {
            ...getAnalyticsPropsDeepLink(promoCode.deepLink),
            ...getAnalyticsPropsEvent(featuredEvent),
            auth_user_id: authUserId,
        });
        await Clipboard.setStringAsync(code);
        Alert.alert('Promo Code Copied', `${code} copied to clipboard.`);
    };


    // we want to go to the community events screen but if they want
    // to go back, they will go to the home screen instead of this one
    const onClickLink = (link: 'event_details' | 'community_events') => {
        if (!promoCode) return;

        if (link === 'community_events') {
            logEvent(UE.PromoScreenExploreClicked, {
                ...getAnalyticsPropsDeepLink(promoCode.deepLink),
                ...getAnalyticsPropsEvent(featuredEvent),
                auth_user_id: authUserId,
            });

            navigation.navigate('Community Events', { communityId: organizer.communities[0].id });
        } else {
            logEvent(UE.PromoScreenEventDetailsClicked, {
                ...getAnalyticsPropsDeepLink(promoCode.deepLink),
                ...getAnalyticsPropsEvent(featuredEvent),
                auth_user_id: authUserId,
            });

            navigation.navigate('Event Details', { selectedEvent: featuredEvent });
        }

        onPromoScreenViewed();
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Svg style={StyleSheet.absoluteFill}>
                    <Circle cx="20%" cy="10%" r="100" fill="#F2E5FF" />
                    <Circle cx="80%" cy="20%" r="70" fill="#E2D4FF" />
                    <Circle cx="30%" cy="80%" r="90" fill="#F7EDFF" />
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
    safe: { flex: 1, backgroundColor: '#F5ECFF' },
    scroll: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 24 },
    eventBanner: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginVertical: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D005F',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#4C4C4C',
        textAlign: 'center',
    },
    organizer: {
        fontSize: 20,
        fontWeight: '600',
        color: '#7055D3',
        marginVertical: 8,
        textAlign: 'center',
    },
    discount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#2D005F',
        marginTop: 16,
        textAlign: 'center',
    },
    productTypeMain: {
        fontSize: 20,
        fontWeight: '600',
        color: '#9C27B0',
        textAlign: 'center',
        marginBottom: 12,
    },
    productTypeCard: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9C27B0',
        marginBottom: 6,
    },
    codeBox: {
        backgroundColor: '#EEE1FF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 14,
        color: '#5D5D5D',
        marginBottom: 4,
    },
    code: {
        fontSize: 24,
        fontWeight: '600',
        color: '#2D005F',
        backgroundColor: '#EDE1FF',
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    exploreBtn: {
        backgroundColor: '#2D005F',
        borderRadius: 30,
        paddingVertical: 14,
        paddingHorizontal: 36,
        marginBottom: 20,
    },
    exploreText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cardWrapper: {
        width: '100%',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        alignItems: 'flex-start',
        width: '100%',
    },
    cardCode: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7055D3',
        flexShrink: 1,
    },
    copyBtn: {
        color: '#7055D3',
        fontWeight: '600',
        marginLeft: 12,
        fontSize: 14,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D005F',
        alignSelf: 'flex-start',
        marginTop: 16,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2D005F',
        marginBottom: 8,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    featuredEventName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D005F',
        marginTop: 12,
        textAlign: 'center',
    },
    eventDate: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginBottom: 10,
    },
    eventBtn: {
        backgroundColor: '#7055D3',
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 28,
        marginBottom: 20,
    },
    eventBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
