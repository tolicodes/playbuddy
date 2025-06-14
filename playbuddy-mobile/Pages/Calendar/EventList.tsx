import React, { useEffect, useState } from "react";
import {
    SectionList,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    PixelRatio,
    SectionListRenderItemInfo,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';

import { EventWithMetadata } from "../../Common/Nav/NavStackType";
import { EventListItem, ITEM_HEIGHT } from "./EventListItem";
import { NavStack } from "../../Common/Nav/NavStackType";
import { Event, UE } from "../../commonTypes";
import { BuddyWishlist, useBuddiesContext } from "../Buddies/hooks/BuddiesContext";
import { getAnalyticsPropsDeepLink, getAnalyticsPropsEvent, getAnalyticsPropsPromoCode, logEvent } from "../../Common/hooks/logger";
import { useUserContext } from "../Auth/hooks/UserContext";
import { BORDER_LAVENDER, LAVENDER_BACKGROUND } from "../../components/styles";

const HEADER_HEIGHT = 40;

const getBuddiesAttending = (buddiesWishlists: BuddyWishlist[], eventId: string) => {
    const buddiesWishlist = buddiesWishlists.filter(bw => bw.events.includes(eventId));
    return buddiesWishlist.map(({ user_id, name, avatar_url }) => ({ user_id, name, avatar_url }));
};

type SectionType = {
    title: string;              // e.g., "Apr 13, 2025"
    data: EventWithMetadata[];  // events for that date
};

interface EventListProps {
    sections: SectionType[];
    sectionListRef?: React.RefObject<SectionList<Event>>;
    reloadEvents?: () => void;
    isLoadingEvents?: boolean;
}

const EventList: React.FC<EventListProps> = ({
    sections,
    sectionListRef,
    reloadEvents,
    isLoadingEvents,
}) => {
    const navigation = useNavigation<NavStack>();
    const { buddiesWishlists } = useBuddiesContext();
    const { authUserId, currentDeepLink } = useUserContext();
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    useEffect(() => {
        if (selectedEvent) {
            navigation.navigate('Event Details', { selectedEvent });
        }
    }, [selectedEvent]);

    const renderItem = ({ item: event }: SectionListRenderItemInfo<EventWithMetadata>) => {
        const buddiesAttending = getBuddiesAttending(buddiesWishlists.data || [], event.id);

        const promoCode = event.promo_codes ? event.promo_codes[0] : null;

        return (
            <View style={styles.eventItemWrapper}>
                <EventListItem
                    item={event}
                    onPress={(e) => {
                        // in case we navigate back to the same event, we need to trigger a re-render
                        setSelectedEvent({ ...e });
                        logEvent(UE.EventListItemClicked, {
                            auth_user_id: authUserId ?? '',
                            ...getAnalyticsPropsEvent(e),
                            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
                        });
                    }}
                />
            </View>
        );
    };

    const renderSectionHeader = ({ section }: { section: SectionType }) => (
        <View style={styles.sectionHeaderWrapper}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
        </View>
    );

    return (
        <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item, i) => `${i}_${item.id}`}
            stickySectionHeadersEnabled={true}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            getItemLayout={sectionListGetItemLayout({
                getItemHeight: () => ITEM_HEIGHT,
                getSectionHeaderHeight: () => HEADER_HEIGHT,
            })}
            ListEmptyComponent={
                <View style={styles.emptyList}>
                    {isLoadingEvents ? (
                        <ActivityIndicator size="large" color="#007AFF" />
                    ) : (
                        <Text style={styles.emptyText}>No events found</Text>
                    )}
                </View>
            }
            onScrollToIndexFailed={(e) => {
                logEvent('event_list_scroll_to_index_failed');
            }}
        />
    );
};

export default EventList;

const styles = StyleSheet.create({
    sectionHeaderWrapper: {
        backgroundColor: LAVENDER_BACKGROUND,
        paddingHorizontal: 20,
        height: HEADER_HEIGHT,
        justifyContent: 'center',
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
    },
    eventItemWrapper: {
        backgroundColor: LAVENDER_BACKGROUND,
    },
});
