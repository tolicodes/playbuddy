import React, { useMemo } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import EventCalendarView from '../Calendar/EventCalendarView';
import { useBuddiesContext } from './BuddiesContext';
import { useCalendarContext } from '../Calendar/CalendarContext';
import { getSmallAvatarUrl } from '../Common/imageUtils';

const BuddyEvents = ({ route }: { route: { params: { buddyAuthUserId: string } } }) => {
    const { buddyAuthUserId } = route.params;
    const { buddiesWishlists } = useBuddiesContext();
    const { filteredEvents } = useCalendarContext();

    const buddyInfo = useMemo(() => {
        return buddiesWishlists.data?.find(e => e.user_id === buddyAuthUserId)
    }, [buddiesWishlists, buddyAuthUserId])

    const buddyEventsWithMetadata = useMemo(() => {
        if (!buddiesWishlists.data) return [];

        return filteredEvents.filter(event => buddiesWishlists.data.find(e => e.events.includes(event.id) && e.user_id === buddyAuthUserId))
    }, [buddiesWishlists, filteredEvents]);

    const avatarUrl = buddyInfo?.avatar_url && getSmallAvatarUrl(buddyInfo.avatar_url);

    return (
        <View>
            <View style={styles.titleContainer}>
                {avatarUrl && (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatar}
                    />
                )}
                <Text style={styles.title}>{buddyInfo?.name}&apos;s Events</Text>
            </View>
            <EventCalendarView events={buddyEventsWithMetadata || []} />
        </View>
    )
};

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 10
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    avatar: {
        width: 30,
        height: 30,
        marginRight: 10,
        borderRadius: 15
    }
});

export default BuddyEvents;
