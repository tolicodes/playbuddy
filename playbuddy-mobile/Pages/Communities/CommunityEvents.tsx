import React, { useLayoutEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import type { NavStack } from "../../Common/Nav/NavStackType";

export const CommunityEvents = ({
    route,
}: {
    route: {
        params: {
            communityId: string;
            communityIds?: string[];
            displayName?: string;
            organizerId?: string;
            title?: string;
        };
    };
}) => {
    const { communityId, communityIds = [], displayName, organizerId, title } = route.params;
    const navigation = useNavigation<NavStack>();
    const { data: allEvents = [] } = useFetchEvents();
    const { communities } = useCommonContext();

    const ids = communityIds.length ? communityIds : [communityId];
    const thisCommunity = communities.allCommunities.find(community => community.id === communityId);
    const communityName = displayName || thisCommunity?.name || "Community";

    const organizerMatchId = organizerId || thisCommunity?.organizer_id;
    const communityEvents = allEvents.filter((event) => {
        const matchesCommunity = event.communities?.some((community) =>
            ids.includes(community.id)
        );
        if (matchesCommunity) return true;
        if (organizerMatchId) {
            return event.organizer?.id?.toString() === organizerMatchId.toString();
        }
        return false;
    });

    useLayoutEffect(() => {
        if (communityName && title !== communityName) {
            navigation.setParams({ title: communityName });
        }
    }, [communityName, navigation, title]);

    return (
        <View style={styles.container}>
            <EventCalendarView events={communityEvents} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default CommunityEvents;
