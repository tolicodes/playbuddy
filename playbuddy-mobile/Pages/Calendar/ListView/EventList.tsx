import React, { useEffect, useState } from "react";
import {
    SectionList,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SectionListRenderItemInfo,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';

import { EventWithMetadata } from "../../../Common/Nav/NavStackType";
import { EventListItem, ITEM_HEIGHT } from "./EventListItem";
import { NavStack } from "../../../Common/Nav/NavStackType";
import { Event } from "../../../commonTypes";
import { logEvent } from "../../../Common/hooks/logger";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { useFetchAttendees } from "../../../Common/db-axios/useAttendees";
import { UE } from "../../../Common/types/userEventTypes";
import { getEventAnalyticsProps, useAnalyticsProps } from "../../../Common/hooks/useAnalytics";

const HEADER_HEIGHT = 40;

type SectionType = {
    title: string;              // e.g., "Apr 13, 2025"
    data: EventWithMetadata[];  // events for that date
};

interface EventListProps {
    sections: SectionType[];
    sectionListRef?: React.RefObject<SectionList<Event>>;
    isLoadingEvents?: boolean;
}

const EventList: React.FC<EventListProps> = ({
    sections,
    sectionListRef,
    isLoadingEvents,
}) => {
    const navigation = useNavigation<NavStack>();
    const { currentDeepLink } = useUserContext();
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const { data: attendees } = useFetchAttendees();
    const analyticsProps = useAnalyticsProps();

    useEffect(() => {
        if (selectedEvent) {
            navigation.navigate('Event Details', {
                selectedEvent,
                title: selectedEvent.name,
            });
        }
    }, [selectedEvent]);

    const renderItem = ({ item: event }: SectionListRenderItemInfo<EventWithMetadata>) => {
        const attendeesForEvent = attendees?.find((a) => a.event_id === event.id)?.attendees || [];
        return (
            <View style={styles.eventItemWrapper}>
                <EventListItem
                    item={event}
                    onPress={(e) => {
                        const eventAnalyticsProps = getEventAnalyticsProps(e, currentDeepLink);

                        // in case we navigate back to the same event, we need to trigger a re-render
                        setSelectedEvent({ ...e });
                        logEvent(UE.EventListItemClicked, {
                            ...analyticsProps,
                            ...eventAnalyticsProps,
                        });
                    }}
                    attendees={attendeesForEvent}
                />
            </View>
        );
    };

    const renderSectionHeader = ({ section }: { section: SectionType }) => (
        <View style={styles.sectionHeaderOuterWrapper}>
            <View style={styles.sectionHeaderPill}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        </View>
    );

    return (
        <SectionList
            ref={sectionListRef}
            style={styles.sectionList}
            sections={sections}
            keyExtractor={(item, i) => `${i}_${item.id}`}
            stickySectionHeadersEnabled={true}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            getItemLayout={sectionListGetItemLayout({
                getItemHeight: () => ITEM_HEIGHT,
                getSectionHeaderHeight: () => HEADER_HEIGHT + 10 + 20,
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
            }}
        />
    );
};

export default EventList;

const styles = StyleSheet.create({
    sectionList: {
        marginTop: 10,
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: 10,
        paddingTop: 20,
        marginHorizontal: 16,
    },
    sectionHeaderPill: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        height: HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.08)',
        alignSelf: 'center',
        // subtle shadow for depth
        shadowColor: '#000',
        shadowOpacity: 0.50,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3, // Android shadow
    },
    sectionHeaderText: {
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
        color: 'white',
    },
    eventItemWrapper: {
        backgroundColor: 'transparent',
    },
});
