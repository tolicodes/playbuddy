import React from "react";
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
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../../components/styles";

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
    const { data: attendees } = useFetchAttendees();
    const analyticsProps = useAnalyticsProps();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const renderItem = ({ item: event }: SectionListRenderItemInfo<EventWithMetadata>) => {
        const attendeesForEvent = attendees?.find((a) => a.event_id === event.id)?.attendees || [];
        return (
            <View style={styles.eventItemWrapper}>
                <EventListItem
                    item={event}
                    onPress={(e) => {
                        const eventAnalyticsProps = getEventAnalyticsProps(e, currentDeepLink);

                        navigation.push('Event Details', {
                            selectedEvent: e,
                            title: e.name,
                        });
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
            keyExtractor={(item) => String(item.id)}
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
                        <ActivityIndicator size="large" color={colors.linkBlue} />
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
        marginTop: spacing.xs,
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
        marginHorizontal: spacing.lg,
    },
    sectionHeaderPill: {
        width: '100%',
        backgroundColor: colors.surfaceWhiteFrosted,
        paddingHorizontal: spacing.lg,
        height: HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderLavenderSoft,
        alignSelf: 'stretch',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    sectionHeaderText: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.jumbo,
    },
    emptyText: {
        fontSize: fontSizes.xl,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    eventItemWrapper: {
        backgroundColor: 'transparent',
    },
});
