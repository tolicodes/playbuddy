import React, {
    useState,
    useCallback,
    useMemo,
    useRef
} from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Text,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useRecordSwipeChoice } from '../Calendar/hooks/useWishlist';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useBadgeNotifications } from '../../Common/Nav/useBadgeNotifications';
import { logEvent } from '../../Common/hooks/logger';
import { LAVENDER_BACKGROUND } from '../../components/styles';

import { DiscoverEventsTour } from './DiscoverEventsTour';
import { DiscoverEventsCard } from './DiscoverEventsCard';
import { useShowDiscoverEventsTour } from './DiscoverEventsTour';
import { UE } from '../../userEventTypes';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SwipeDirection = 'left' | 'right';

export const DiscoverGame: React.FC = () => {
    const { availableCardsToSwipe, toggleWishlistEvent } = useCalendarContext();
    const { authUserId } = useUserContext();
    const recordSwipe = useRecordSwipeChoice();
    const swiperRef = useRef<Swiper<any> | null>(null);
    const analyticsProps = useAnalyticsProps();

    const { visible: discoverEventsTourVisible, saveVisible: setDiscoverEventsTourVisible } = useShowDiscoverEventsTour();

    // Show a badge count for how many cards remain
    useBadgeNotifications({ availableCardsToSwipe });

    // history for undo
    const [swipedHistory, setSwipedHistory] = useState<
        Array<{ index: number; direction: SwipeDirection }>
    >([]);

    // We take a snapshot array of cards. Whenever availableCardsToSwipe changes,
    // we re-create the array. (If you want it fully dynamic, you could skip useMemo.)
    const cards = useMemo(() => [...availableCardsToSwipe], []);

    /**
     * 1) Handle a swipe in either direction (left=skip, right=wishlist).
     * 2) Toggle wishlist if direction == 'right'
     * 3) Record analytics
     * 4) Push to swipedHistory so we can undo later
     */
    const handleSwipe =
        (direction: SwipeDirection) =>
            (cardIndex: number) => {
                const event = cards[cardIndex];
                if (!event) return;

                if (direction === 'right') {
                    toggleWishlistEvent.mutate({
                        eventId: event.id,
                        isOnWishlist: true
                    });
                }

                recordSwipe.mutate({
                    event_id: event.id,
                    choice: direction === 'right' ? 'wishlist' : 'skip',
                    list: 'main'
                });

                logEvent(
                    direction === 'right'
                        ? UE.SwipeModeSwipeRight
                        : UE.SwipeModeSwipeLeft,
                    {
                        ...analyticsProps,
                        event_id: event.id,
                    }
                );

                setSwipedHistory((history) => [
                    ...history,
                    { index: cardIndex, direction }
                ]);
            };

    const onSwipeRight = handleSwipe('right');
    const onSwipeLeft = handleSwipe('left');

    /**
     * When the user taps “undo,” we pop the last swipe off of swipedHistory
     * and call swiperRef.current?.swipeBack() to restore the previous card.
     */
    const undoSwipe = useCallback(() => {
        if (!swipedHistory.length || !swiperRef.current) return;

        const last = swipedHistory[swipedHistory.length - 1];
        swiperRef.current.swipeBack();
        setSwipedHistory((h) => h.slice(0, -1));

        // If the last swipe was “right,” we need to remove from wishlist
        if (last.direction === 'right') {
            const event = cards[last.index];
            if (event) {
                toggleWishlistEvent.mutate({
                    eventId: event.id,
                    isOnWishlist: false
                });
            }
        }

        // Analytics for undo
        const undoneEvent = cards[last.index];
        if (undoneEvent) {
            logEvent(UE.SwipeModeUndo, {
                ...analyticsProps,
                event_id: undoneEvent.id,
            });
        }
    }, [swipedHistory, cards, toggleWishlistEvent]);

    if (!authUserId || discoverEventsTourVisible) {
        return <DiscoverEventsTour onClose={() => setDiscoverEventsTourVisible(false)} />
    }

    if (cards.length === 0) {
        return <View style={styles.container}>
            <Text>You're done swiping! Go outside and play!</Text>
        </View>
    }

    return (
        <View style={styles.container}>
            {discoverEventsTourVisible && <DiscoverEventsTour onClose={() => setDiscoverEventsTourVisible(false)} />}

            <View style={styles.swiperContainer}>

                <Swiper
                    ref={(ref) => (swiperRef.current = ref)}
                    cards={cards}
                    renderCard={(event) => (
                        <View style={{ flex: 1 }}>
                            <DiscoverEventsCard
                                key={event.id}
                                event={event}
                            />
                        </View>
                    )}
                    onSwipedRight={onSwipeRight}
                    onSwipedLeft={onSwipeLeft}
                    cardIndex={0}
                    stackSize={3}
                    verticalSwipe={false}
                    backgroundColor={LAVENDER_BACKGROUND}
                    stackSeparation={20}
                    overlayLabels={{
                        left: {
                            title: 'SKIP',
                            style: styles.overlayLeft
                        },
                        right: {
                            title: 'WISHLIST',
                            style: styles.overlayRight
                        }
                    }}
                    cardStyle={{ flex: 1 }}
                />
            </View>

            {/* ─── Swipe Control Buttons Row ───────────────────────────────────────────── */}
            <View style={styles.controlsRow}>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => {
                        swiperRef.current?.swipeLeft()
                        // not sure how to get event index
                        logEvent(UE.SwipeModeBottomPressLeft, analyticsProps);
                    }}
                >
                    <Icon name="close" size={32} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={undoSwipe}
                >
                    <Icon name="undo" size={28} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, styles.heartButton]}
                    onPress={() => {
                        swiperRef.current?.swipeRight()
                        // not sure how to get event index
                        logEvent(UE.SwipeModeBottomPressRight, analyticsProps);
                    }}
                >
                    <Icon name="favorite" size={32} color="#FF2675" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const BUTTON_SIZE = 56;
const BUTTON_SPACING = 32;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    swiperContainer: {
        flex: 1,
        width: '100%',
        paddingBottom: 120,
    },
    overlayLeft: {
        label: {
            backgroundColor: '#FF3B30',
            color: '#fff',
            fontSize: 24,
            borderRadius: 5,
            padding: 10,
            textAlign: 'center'
        }
    },
    overlayRight: {
        label: {
            backgroundColor: '#34C759',
            color: '#fff',
            fontSize: 24,
            borderRadius: 5,
            padding: 10,
            textAlign: 'center'
        }
    },
    controlsRow: {
        position: 'absolute',
        bottom: 40,
        width: SCREEN_WIDTH,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    controlButton: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: BUTTON_SPACING / 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4
    },
    heartButton: {
        backgroundColor: '#fff'
    }
});
