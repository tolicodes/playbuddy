import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Image } from 'expo-image'
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

export const SwipeMode = () => {
    const { availableCardsToSwipe } = useCalendarContext();
    const { authUserId } = useUserContext();

    const { toggleWishlistEvent, } = useCalendarContext(); // use the hook to handle wishlist

    const recordSwipe = useRecordSwipeChoice();

    const [initialCards, setInitialCards] = useState(availableCardsToSwipe);
    useEffect(() => {
        setInitialCards(availableCardsToSwipe);
    }, [])

    const onSwipeRight = (cardIndex: number) => {
        const eventId = initialCards[cardIndex].id;

        toggleWishlistEvent.mutate({ eventId, isOnWishlist: true });

        recordSwipe.mutate({
            event_id: eventId,
            choice: 'wishlist',
            list: 'main',
        });

        logEvent('swipe_mode_swipe_right', { event_id: eventId, event_name: initialCards[cardIndex].name });
    };

    const onSwipeLeft = (cardIndex: number) => {
        const eventId = initialCards[cardIndex].id;

        recordSwipe.mutate({
            event_id: eventId,
            choice: 'skip',
            list: 'main',
        });

        logEvent('swipe_mode_swipe_left', { event_id: eventId, event_name: initialCards[cardIndex].name });
    };

    const renderCard = (event: Event) => {
        if (!event) {
            return (
                <NoEventsToSwipe />
            )
        }

        // TODO: find out why event is not always available
        const imageUrl = event?.image_url && getSmallAvatarUrl(event?.image_url);
        return (
            <View style={styles.card}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <View style={styles.cardContent}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{moment(event?.start_date).format('dddd')}</Text>
                    <Text >{moment(event?.start_date).format('MMM D')} {formatDate(event)}</Text>

                    <Text style={styles.eventName}>{event.name}</Text>

                    <Text style={styles.organizer}>{event?.organizer?.name}</Text>

                    <Button
                        title="More Info"
                        onPress={() => {
                            Linking.openURL(event.event_url);
                            logEvent('swipe_mode_more_info_click', { eventId: event.id });
                        }}

                    />
                </View>
            </View>
        );
    }

    if (!authUserId) {
        return <LoginToAccess entityToAccess='Swipe Mode' />
    }

    const NoEventsToSwipe = () => {
        return <View style={styles.container}>
            <Text>You're done swiping for today! Go have fun!</Text>
        </View>
    }

    if (!availableCardsToSwipe.length) {
        return <NoEventsToSwipe />
    }

    return (
        <View style={styles.container}>
            <Swiper
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
                                textAlign: 'right',
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
                            },
                        },
                    },
                }}
            />

        </View>
    )
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
        height: 500,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        backgroundColor: '#fff',
        overflow: 'hidden',
        padding: 10,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    image: {
        width: '100%',
        height: 200,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    cardContent: {
        padding: 20,
        alignItems: 'center',
    },
    eventName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginTop: 20
    },
    organizer: {
        fontSize: 16,
        color: '#555',
        marginBottom: 20,
    },
});
