import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import EventCalendarView from "../Calendar/EventCalendarView/EventCalendarView";
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import { logEvent } from "../../Common/hooks/logger";
import { useJoinCommunity, useLeaveCommunity } from "../../Common/hooks/useCommunities";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";

export const CommunityEvents = ({ route: { params: { communityId } } }: { route: { params: { communityId: string } } }) => {
    const { allEvents } = useCalendarContext();
    const { communities, myCommunities } = useCommonContext();
    const { authUserId } = useUserContext();

    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();

    const thisCommunity = communities.allCommunities.find(community => community.id === communityId);

    const communityEvents = allEvents.filter(
        event => event.communities?.some(community => community.id === communityId)
    );

    const handleJoin = useCallback((communityId: string) => {
        if (!authUserId) {
            alert('Create an account to join a community!')
            return;
        }
        joinCommunity.mutate({ community_id: communityId, type: 'organizer_public_community' });
        logEvent('community_events_community_joined', { communityId });
    }, [joinCommunity]);

    const handleLeave = useCallback((communityId: string) => {
        leaveCommunity.mutate({ community_id: communityId });
        logEvent('community_events_community_left', { communityId });
    }, [leaveCommunity]);

    const isJoined = myCommunities.allMyCommunities?.some(community => community.id === communityId);


    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <Text style={styles.communityName}>
                    {thisCommunity?.name}
                </Text>
                <TouchableOpacity style={isJoined ? styles.unfollowButton : styles.followButton} onPress={
                    isJoined ? () => handleLeave(communityId) : () => handleJoin(communityId)
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