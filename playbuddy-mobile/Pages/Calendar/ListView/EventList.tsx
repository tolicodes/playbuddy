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
import { EventListItemClassic, CLASSIC_ITEM_HEIGHT } from "./EventListItemClassic";
import type { EventListViewMode } from "./eventListViewMode";
import { NavStack } from "../../../Common/Nav/NavStackType";
import { navigateToHomeStackScreen } from "../../../Common/Nav/navigationHelpers";
import { Event } from "../../../commonTypes";
import { useUserContext } from "../../Auth/hooks/UserContext";
import { useFetchAttendees } from "../../../Common/db-axios/useAttendees";
import { ADMIN_EMAILS } from "../../../config";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../../components/styles";
import { useCalendarCoach } from "../../PopupManager";

const HEADER_HEIGHT = 34;
export const EVENT_SECTION_HEADER_HEIGHT = HEADER_HEIGHT + spacing.md + spacing.lg;
const CALENDAR_COACH_BORDER_COLOR = 'transparent';

type SectionType = {
    title: string;              // e.g., "Apr 13, 2025"
    data: EventWithMetadata[];  // events for that date
    date?: string;
    key?: string;
};

interface EventListProps {
    sections: SectionType[];
    sectionListRef?: React.RefObject<SectionList<Event>>;
    isLoadingEvents?: boolean;
    viewMode?: EventListViewMode;
    isOnWishlist?: (eventId: number) => boolean;
    onToggleWishlist?: (eventId: number, isOnWishlist: boolean) => void;
    wishlistEventsCount?: number;
    isEventSourceExcluded?: (event: EventWithMetadata) => boolean;
    listHeaderComponent?: React.ReactNode;
    listHeaderHeight?: number;
    onListScroll?: (offsetY: number, layoutHeight: number, contentHeight: number) => void;
    onListScrollBeginDrag?: () => void;
    onListScrollEndDrag?: () => void;
    onListMomentumScrollEnd?: () => void;
    onListReady?: () => void;
}

const EventList: React.FC<EventListProps> = ({
    sections,
    sectionListRef,
    isLoadingEvents,
    viewMode,
    isOnWishlist,
    onToggleWishlist,
    wishlistEventsCount,
    isEventSourceExcluded,
    listHeaderComponent,
    listHeaderHeight = 0,
    onListScroll,
    onListScrollBeginDrag,
    onListScrollEndDrag,
    onListMomentumScrollEnd,
    onListReady,
}) => {
    const navigation = useNavigation<NavStack>();
    const { userProfile } = useUserContext();
    const { data: attendees } = useFetchAttendees();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const resolvedViewMode: EventListViewMode = viewMode ?? 'image';
    const itemHeight = resolvedViewMode === 'classic' ? CLASSIC_ITEM_HEIGHT : ITEM_HEIGHT;
    const ItemComponent = resolvedViewMode === 'classic' ? EventListItemClassic : EventListItem;
    const calendarCoach = useCalendarCoach();
    const showCoachOverlay = !!calendarCoach?.showOverlay;
    const coachAnchorId = calendarCoach?.anchorEventId ?? null;
    const firstEventId = sections[0]?.data?.[0]?.id ?? null;

    const renderItem = ({ item: event }: SectionListRenderItemInfo<EventWithMetadata>) => {
        const attendeesForEvent = attendees?.find((a) => a.event_id === event.id)?.attendees || [];
        const shouldShowCoachTooltip = !!calendarCoach?.toast
            && (coachAnchorId ? coachAnchorId === event.id : firstEventId === event.id);
        return (
            <View style={styles.eventItemWrapper}>
                <ItemComponent
                    item={event}
                    onPress={(e) => {
                        navigateToHomeStackScreen(navigation, 'Event Details', {
                            selectedEvent: e,
                            title: e.name,
                        });
                    }}
                    attendees={attendeesForEvent}
                    isAdmin={isAdmin}
                    listViewMode={resolvedViewMode}
                    isOnWishlist={isOnWishlist}
                    onToggleWishlist={onToggleWishlist}
                    wishlistEventsCount={wishlistEventsCount}
                    isEventSourceExcluded={isEventSourceExcluded}
                    showCalendarCoachTooltip={shouldShowCoachTooltip}
                />
            </View>
        );
    };

    const renderSectionHeader = ({ section }: { section: SectionType }) => (
        <View style={styles.sectionHeaderOuterWrapper}>
            <View style={[styles.sectionHeaderPill, showCoachOverlay && styles.sectionHeaderPillCoach]}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                {showCoachOverlay && <View pointerEvents="none" style={styles.calendarCoachScrim} />}
            </View>
        </View>
    );

    const listHeaderWithScrim = listHeaderComponent ? (
        <View style={styles.listHeaderContainer}>
            {listHeaderComponent}
            {showCoachOverlay && <View pointerEvents="none" style={styles.calendarCoachScrim} />}
        </View>
    ) : null;

    return (
        <SectionList
            key={`event-list-${resolvedViewMode}`}
            ref={sectionListRef}
            style={styles.sectionList}
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            stickySectionHeadersEnabled={true}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={listHeaderWithScrim}
            getItemLayout={sectionListGetItemLayout({
                getItemHeight: () => itemHeight,
                getSectionHeaderHeight: () => EVENT_SECTION_HEADER_HEIGHT,
                getListHeaderHeight: () => listHeaderHeight,
            })}
            onScroll={
                onListScroll
                    ? (event) => {
                        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                        onListScroll(
                            contentOffset.y,
                            layoutMeasurement.height,
                            contentSize.height
                        );
                    }
                    : undefined
            }
            onScrollBeginDrag={onListScrollBeginDrag}
            onScrollEndDrag={onListScrollEndDrag}
            onMomentumScrollEnd={onListMomentumScrollEnd}
            scrollEventThrottle={onListScroll ? 16 : undefined}
            onContentSizeChange={
                onListReady
                    ? (_width, height) => {
                        if (height > 0) {
                            onListReady();
                        }
                    }
                    : undefined
            }
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
        overflow: "hidden",
    },
    sectionHeaderPillCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
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
    listHeaderContainer: {
        position: "relative",
    },
    calendarCoachScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(64, 64, 64, 0.8)",
    },
});
