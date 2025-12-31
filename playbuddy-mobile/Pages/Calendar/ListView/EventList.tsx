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
import { ADMIN_EMAILS } from "../../../config";

const HEADER_HEIGHT = 34;

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
    const { currentDeepLink, userProfile } = useUserContext();
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const { data: attendees } = useFetchAttendees();
    const analyticsProps = useAnalyticsProps();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

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
                    isAdmin={isAdmin}
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
                getSectionHeaderHeight: () => HEADER_HEIGHT + 18,
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
        marginTop: 4,
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: 12,
        paddingTop: 12,
        marginHorizontal: 16,
    },
    sectionHeaderPill: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 16,
        height: HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(90,67,181,0.12)',
        alignSelf: 'stretch',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2F2A3A',
        textAlign: 'center',
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
    eventItemWrapper: {
        backgroundColor: 'transparent',
    },
});
