import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useUserContext } from '../../hooks/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../../../Common/Nav/NavStackType';
import { useCalendarContext } from '../../../Calendar/hooks/CalendarContext';
export const WeeklyPromoList = () => {
    const { currentDeepLink } = useUserContext();
    const { allEvents } = useCalendarContext();
    const navigation = useNavigation<NavStack>();

    const mappedEvents = currentDeepLink?.deep_link_events?.map((event) => ({
        dayOfWeek: new Date(event.event.start_date).toLocaleDateString('en-US', { weekday: 'short' }),
        title: event.event.name,
        organizer: event.event.organizer.name,
        description: event.description,
        image: event.event.image_url,
        promoCodeDiscount: event.featured_promo_code ? `${event.featured_promo_code?.discount}% off` : null,
        event: event.event
    })).sort((a, b) => new Date(a.event.start_date).getTime() - new Date(b.event.start_date).getTime());

    const getFullEvent = (event_id: number) => {
        return allEvents.find((event) => event.id === event_id);
    }

    const onPressCard = (event_id: number) => {
        const event = getFullEvent(event_id);
        if (!event) return;
        navigation.navigate('Event Details', { selectedEvent: event });
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>PB's Weekly Picks</Text>
            <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                style={[styles.homeButton, styles.centeredButton]}
            >
                <Text>Home</Text>
            </TouchableOpacity>
            {mappedEvents?.map((item, idx) => (
                <TouchableOpacity key={idx} onPress={() => onPressCard(item.event.id)}>
                    <View key={idx} style={styles.card}>
                        <View style={styles.dayWrapper}>
                            <Text style={styles.day}>{item.dayOfWeek}</Text>
                        </View>
                        <View style={styles.detailsContainer}>
                            <View style={styles.textContainer}>
                                <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                                <Text style={styles.organizer}>{item.organizer}</Text>
                                <Text style={styles.description} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            </View>
                            <View style={styles.imageWrapper}>
                                <Image source={{ uri: item.image }} style={styles.image} />
                                {item.promoCodeDiscount && (
                                    <View style={styles.discountBubble}><Text style={styles.discountText}>{item.promoCodeDiscount}</Text></View>
                                )}
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 0,
        paddingBottom: 32,
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
        color: '#2D005F',
        marginTop: 10,
    },
    homeButton: {
        marginBottom: 10,
        backgroundColor: '#F4E1FF',
        padding: 10,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredButton: {
        alignSelf: 'center',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#DDD',
        // paddingVertical: 12,
        paddingRight: 12,
        marginBottom: 14,
        marginHorizontal: 16,
        alignItems: 'center',
        height: 120,
    },
    dayWrapper: {
        width: 60,
        backgroundColor: '#F4E1FF',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    day: {
        fontSize: 20,
        fontWeight: '600',
        color: '#6A1B9A',
        textAlign: 'center',
    },
    detailsContainer: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: 8,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D005F',
    },
    organizer: {
        fontSize: 14,
        color: '#666',
    },
    description: {
        fontSize: 13,
        color: '#333',
        marginTop: 4,
        lineHeight: 16,
    },
    imageWrapper: {
        position: 'relative',
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    discountBubble: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#FFD700',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    discountText: {
        color: 'black',
        fontSize: 12,
        fontWeight: '600',
    },
});