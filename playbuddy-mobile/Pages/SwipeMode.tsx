import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Dimensions } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Image } from 'expo-image';
import { useCalendarContext } from './Calendar/hooks/CalendarContext';
import { formatDate } from './Calendar/hooks/calendarUtils';
import { Event } from '../commonTypes';
import moment from 'moment';
import { useRecordSwipeChoice } from './Calendar/hooks/useWishlist';
import { useUserContext } from './Auth/hooks/UserContext';
import { LoginToAccess } from '../Common/LoginToAccess';
import { Button } from '@rneui/themed';
import { getSmallAvatarUrl } from '../Common/hooks/imageUtils';
import { logEvent } from '../Common/hooks/logger';
import { useBadgeNotifications } from '../Common/Nav/useBadgeNotifications';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CARD_HEIGHT = Dimensions.get('window').height * 0.6;

export const SwipeMode = () => {
    const { availableCardsToSwipe } = useCalendarContext();
    const { authUserId } = useUserContext();

    useBadgeNotifications({ availableCardsToSwipe });

    const { toggleWishlistEvent } = useCalendarContext();

    const recordSwipe = useRecordSwipeChoice();

    const [initialCards, setInitialCards] = useState(availableCardsToSwipe);
    const [swipedCards, setSwipedCards] = useState([]);
    const [swiperRef, setSwiperRef] = useState(null);

    useEffect(() => {
        setInitialCards(availableCardsToSwipe);
    }, []);

    const onSwipeRight = (cardIndex: number) => {
        const eventId = initialCards[cardIndex].id;

        toggleWishlistEvent.mutate({ eventId, isOnWishlist: true });

        recordSwipe.mutate({
            event_id: eventId,
            choice: 'wishlist',
            list: 'main',
        });

        setSwipedCards([...swipedCards, { index: cardIndex, direction: 'right' }]);

        logEvent('swipe_mode_swipe_right', { event_id: eventId, event_name: initialCards[cardIndex].name });
    };

    const onSwipeLeft = (cardIndex: number) => {
        const eventId = initialCards[cardIndex].id;

        recordSwipe.mutate({
            event_id: eventId,
            choice: 'skip',
            list: 'main',
        });

        setSwipedCards([...swipedCards, { index: cardIndex, direction: 'left' }]);

        logEvent('swipe_mode_swipe_left', { event_id: eventId, event_name: initialCards[cardIndex].name });
    };

    const undoSwipe = () => {
        if (swipedCards.length > 0) {
            const lastSwipe = swipedCards[swipedCards.length - 1];
            swiperRef.swipeBack();
            setSwipedCards(swipedCards.slice(0, -1));

            if (lastSwipe.direction === 'right') {
                const eventId = initialCards[lastSwipe.index].id;
                toggleWishlistEvent.mutate({ eventId, isOnWishlist: false });
            }

            logEvent('swipe_mode_undo', { event_id: initialCards[lastSwipe.index].id });
        }
    };

    const renderCard = (event: Event) => {
        if (!event) {
            return <NoEventsToSwipe />;
        }

        const eventPromoCode = event.promo_codes?.find(code => code.scope === 'event');
        const organizerPromoCode = event.organizer?.promo_codes?.find(code => code.scope === 'organizer');

        const promoCode = eventPromoCode || organizerPromoCode;

        const PromoCode = promoCode && (
            <View style={styles.promoCodeBadge}>
                <Text style={styles.promoCodeText}>
                    Promo Code: {promoCode.promo_code}&nbsp;
                </Text>
                <Text style={styles.promoCodeText}>
                    {promoCode.discount_type === 'percent' ? '' : '$'}
                    {promoCode.discount}{promoCode.discount_type === 'percent' ? '%' : ''} off
                </Text>
            </View>
        );

        const imageUrl = event?.image_url && getSmallAvatarUrl(event?.image_url);

        const openUrl = (eventUrl: string) => {
            Linking.openURL(eventUrl);
        };

        return (
            <View style={styles.card}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <View style={styles.textOverlay}>
                    <Text style={styles.dateTextCenter}>{moment(event?.start_date).format('dddd')}</Text>
                    <Text style={styles.dateTextCenter}>{moment(event?.start_date).format('MMM D')} {formatDate(event)}</Text>

                    {PromoCode}

                    {event.visibility === 'private' && (
                        <View style={styles.privateBadge}>
                            <Text style={styles.privateBadgeText}>Private</Text>
                        </View>
                    )}

                    <Text style={styles.eventName}>{event.name}</Text>

                    <Text style={styles.organizer}>{event?.organizer?.name}</Text>

                    <Button
                        title="Get Tickets"
                        buttonStyle={styles.button}
                        onPress={() => {
                            openUrl(event.event_url);
                            logEvent('swipe_mode_more_info_click', { eventId: event.id });
                        }}
                    />
                </View>
            </View>
        );
    };

    if (!authUserId) {
        return <LoginToAccess entityToAccess='Swipe Mode' />;
    }

    const NoEventsToSwipe = () => {
        return (
            <View style={styles.container}>
                <Text style={styles.textCenter}>You're done swiping for today! Go have fun!</Text>
            </View>
        );
    };

    if (!availableCardsToSwipe.length) {
        return <NoEventsToSwipe />;
    }

    return (
        <View style={styles.container}>
            <Swiper
                ref={swiper => setSwiperRef(swiper)}
                cards={initialCards}
                renderCard={renderCard}
                onSwipedRight={onSwipeRight}
                onSwipedLeft={onSwipeLeft}
                backgroundColor={'#f8f9fa'}
                stackSize={3}
                verticalSwipe={false}
                overlayLabels={{
                    left: {
                        title: 'SKIP',
                        style: {
                            label: {
                                backgroundColor: '#FF3B30',
                                color: '#fff',
                                fontSize: 24,
                                borderRadius: 5,
                                padding: 10,
                                textAlign: 'center',
                            },
                        },
                    },
                    right: {
                        title: 'WISHLIST',
                        style: {
                            label: {
                                backgroundColor: '#34C759',
                                color: '#fff',
                                fontSize: 24,
                                borderRadius: 5,
                                padding: 10,
                                textAlign: 'center',
                            },
                        },
                    },
                }}
            />
            {/* <View style={styles.undoButtonContainer}>
                <Button
                    icon={<Icon name="undo" size={24} color="white" />}
                    onPress={undoSwipe}
                    buttonStyle={styles.undoButton}
                    disabled={swipedCards.length === 0}
                />
            </View> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    card: {
        width: '100%',
        height: CARD_HEIGHT,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        borderRadius: 10,
    },
    textOverlay: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    dateTextCenter: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'Avenir-Heavy',
    },
    eventName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'Avenir-Heavy',
    },
    organizer: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: 'Avenir-Book',
    },
    promoCodeBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        marginVertical: 10,
        textAlign: 'center',
    },
    promoCodeText: {
        fontSize: 12,
        color: 'black',
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Avenir-Book',
    },
    privateBadge: {
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
    },
    privateBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Avenir-Book',
    },
    button: {
        backgroundColor: '#007bff',
        borderRadius: 20,
        paddingHorizontal: 30,
        paddingVertical: 10,
        marginTop: 10,
        fontFamily: 'Avenir-Book',
    },
    textCenter: {
        textAlign: 'center',
    },
    undoButtonContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
    },
    undoButton: {
        backgroundColor: '#007bff',
        borderRadius: 30,
        width: 60,
        height: 60,
    },
});
