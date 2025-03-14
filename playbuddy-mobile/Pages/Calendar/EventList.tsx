import React from "react";
import { SectionList, View, Text, StyleSheet, ActivityIndicator, PixelRatio } from "react-native";
import { EventWithMetadata } from "../../Common/Nav/NavStackType";
import { EventListItem, ITEM_HEIGHT } from "./EventListItem";
import { useNavigation } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { NavStack } from "../../Common/Nav/NavStackType";
import { Event } from "../../commonTypes";
import { BuddyWishlist, useBuddiesContext } from "../Buddies/hooks/BuddiesContext";
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout'
import { logEvent } from "../../Common/hooks/logger";

type EventListProps = {
    sections: any;
    screen?: string;
    sectionListRef?: any;
    reloadEvents: any;
    isLoadingEvents: boolean;
};

function getBuddiesAttending(buddiesWishlists: BuddyWishlist[], eventId: string) {
    const buddiesWishlist = buddiesWishlists.filter((buddyWishlist: BuddyWishlist) => buddyWishlist.events.includes(eventId));
    const buddiesAttending = buddiesWishlist.map((buddyWishlist: BuddyWishlist) => ({
        user_id: buddyWishlist.user_id,
        name: buddyWishlist.name,
        avatar_url: buddyWishlist.avatar_url,
    }));

    return buddiesAttending;
}

const EventList = ({ sections, sectionListRef, isLoadingEvents }: EventListProps) => {
    const navigation = useNavigation<NavStack>();

    const { buddiesWishlists } = useBuddiesContext();

    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    useEffect(() => {
        if (selectedEvent) {
            navigation.navigate('Details', { screen: 'Event Details', params: { selectedEvent } });
        }
    }, [selectedEvent]);

    return (<SectionList
        ref={sectionListRef}
        sections={sections}
        stickySectionHeadersEnabled={true}
        getItemLayout={sectionListGetItemLayout({
            getItemHeight: () => ITEM_HEIGHT,
            getSeparatorHeight: () => 1 / PixelRatio.get(),
            getSectionHeaderHeight: () => HEADER_HEIGHT,
        })}
        renderItem={({ item: event }: { item: EventWithMetadata }) => {
            const buddiesAttending = getBuddiesAttending(buddiesWishlists.data || [], event.id);

            return (
                <View>
                    <EventListItem
                        item={event}
                        setSelectedEvent={(event) => {
                            logEvent('event_list_item_clicked', { event_id: event.id, event_name: event.name });
                            setSelectedEvent(event)
                        }}
                        buddiesAttending={buddiesAttending}
                    />
                </View>
            )
        }}
        renderSectionHeader={({ section }: any) => {
            return (
                <Text style={styles.sectionHeader}>{section.title}</Text>
            )
        }}
        keyExtractor={(item, i) => `${i}_${item.id}`}
        ListEmptyComponent={<View style={styles.emptyList}>
            {isLoadingEvents
                ? <ActivityIndicator size="large" color="#007AFF" />
                : <Text>No events found</Text>
            }

        </View>}
        onScrollToIndexFailed={(e) => {
            console.log('scroll_to_index_failed', e);
            logEvent('event_list_scroll_to_index_failed');
        }}

    // initialNumToRender={1000}
    // TODO: Implement pull to refresh
    // onRefresh={() => reloadEvents()}
    />)
}

const HEADER_HEIGHT = 40;

const styles = StyleSheet.create({
    sectionHeader: {
        backgroundColor: 'lightgrey',
        padding: 10,
        fontSize: 16,
        fontWeight: 'bold',
        height: HEADER_HEIGHT,
    },
    emptyList: {
        padding: 20,
        textAlign: 'center',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
    },
});

export default EventList;