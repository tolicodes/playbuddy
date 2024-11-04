import React, { } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Image } from 'expo-image'
import { useCalendarContext } from '../Calendar/CalendarContext';
import { formatDate } from '../Calendar/calendarUtils';
import { Event } from '../commonTypes';
import moment from 'moment';
import { useRecordSwipeChoice } from '../Calendar/hooks/useWishlist';
import { useUserContext } from '../contexts/UserContext';
import { LoginToAccess } from '../Common/LoginToAccess';
import { Button } from '@rneui/themed';
import { getSmallAvatarUrl } from '../Common/imageUtils';

export const SwipeMode: React.FC = () => {
    const { availableCardsToSwipe } = useCalendarContext();
    const { authUserId } = useUserContext();

    // const [showTooltip, setShowTooltip] = useState(false);
    // const [isModalVisible, setModalVisible] = useState(false);

    const { toggleWishlistEvent, } = useCalendarContext(); // use the hook to handle wishlist

    const recordSwipe = useRecordSwipeChoice();

    const onSwipeRight = (cardIndex: number) => {
        const eventId = availableCardsToSwipe[cardIndex].id;
        toggleWishlistEvent.mutate({ eventId, isOnWishlist: true });

        recordSwipe.mutate({
            event_id: eventId,
            choice: 'wishlist',
            list: 'main',
        });
    };

    const onSwipeLeft = (cardIndex: number) => {
        const eventId = availableCardsToSwipe[cardIndex].id;

        recordSwipe.mutate({
            event_id: eventId,
            choice: 'skip',
            list: 'main',
        });

    };

    // const handleAddToBuddyList = (listName: string, eventId: number) => {
    // };

    // const handleTooltipDismiss = async () => {
    //     setShowTooltip(false);
    //     await AsyncStorage.setItem('plannerTooltipShown', 'true');
    // };

    const renderCard = (event: Event) => {
        const imageUrl = event.image_url && getSmallAvatarUrl(event.image_url);
        return (
            <View style={styles.card}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <View style={styles.cardContent}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{moment(event.start_date).format('dddd')}</Text>
                    <Text >{moment(event.start_date).format('MMM D')} {formatDate(event)}</Text>

                    <Text style={styles.eventName}>{event.name}</Text>

                    <Text style={styles.organizer}>{event.organizer.name}</Text>

                    <Button
                        title="More Info"
                        onPress={() => Linking.openURL(event.event_url)}

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
                cards={availableCardsToSwipe}
                renderCard={renderCard}
                onSwipedRight={onSwipeRight}
                onSwipedLeft={onSwipeLeft}
                cardIndex={0}
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
    headerText: {
        fontSize: 18,
        marginVertical: 10,
        textAlign: 'center',
        fontWeight: '600',
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
    tooltip: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    tooltipText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
    },
    wishlistButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    wishlistButtonText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    buddyListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    buddyListText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#007AFF',
    },
    newBuddyListButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
});
