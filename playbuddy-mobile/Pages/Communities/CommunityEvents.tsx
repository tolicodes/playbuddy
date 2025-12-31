import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import { logEvent } from "../../Common/hooks/logger";
import { useJoinCommunity, useLeaveCommunity } from "../../Common/hooks/useCommunities";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useFetchEvents } from "../../Common/db-axios/useEvents";

export const CommunityEvents = ({
    route: { params: { communityId, communityIds = [], displayName, organizerId } },
}: {
    route: { params: { communityId: string; communityIds?: string[]; displayName?: string; organizerId?: string } };
}) => {
    const { data: allEvents = [] } = useFetchEvents();
    const { communities, myCommunities } = useCommonContext();
    const { authUserId } = useUserContext();


    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();

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

    const myCommunityIds = useMemo(
        () => new Set(myCommunities.allMyCommunities?.map((community) => community.id) || []),
        [myCommunities]
    );

    const handleJoin = useCallback((targetIds: string[]) => {
        if (!authUserId) {
            alert('Create an account to join a community!')
            return;
        }
        targetIds.forEach((targetId) => {
            if (myCommunityIds.has(targetId)) return;
            joinCommunity.mutate({ community_id: targetId, type: 'organizer_public_community' });
            logEvent('community_events_community_joined', { communityId: targetId });
        });
    }, [authUserId, joinCommunity, myCommunityIds]);

    const handleLeave = useCallback((targetIds: string[]) => {
        targetIds.forEach((targetId) => {
            if (!myCommunityIds.has(targetId)) return;
            leaveCommunity.mutate({ community_id: targetId });
            logEvent('community_events_community_left', { communityId: targetId });
        });
    }, [leaveCommunity, myCommunityIds]);

    const isJoined = ids.some((id) => myCommunityIds.has(id));


    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <Text style={styles.communityName}>
                    {communityName}
                </Text>
                <TouchableOpacity style={isJoined ? styles.unfollowButton : styles.followButton} onPress={
                    isJoined ? () => handleLeave(ids) : () => handleJoin(ids)
                }>
                    <Text style={styles.buttonText}>{isJoined ? 'Unfollow' : 'Follow'}</Text>
                </TouchableOpacity>
            </View>

            <EventCalendarView events={communityEvents} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    communityName: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    followButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 5,
    },
    unfollowButton: {
        backgroundColor: '#ff3b30',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    }
});

export default CommunityEvents;
