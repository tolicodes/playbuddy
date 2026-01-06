import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import { logEvent } from "../../Common/hooks/logger";
import { useJoinCommunity, useLeaveCommunity } from "../../Common/hooks/useCommunities";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../components/styles";

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

    useLayoutEffect(() => {
        if (communityName && title !== communityName) {
            navigation.setParams({ title: communityName });
        }
    }, [communityName, navigation, title]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        isJoined ? styles.followButtonActive : styles.followButtonInactive,
                    ]}
                    onPress={isJoined ? () => handleLeave(ids) : () => handleJoin(ids)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={isJoined ? "Following community" : "Follow community"}
                >
                    <View style={styles.followButtonContent}>
                        <FontAwesome
                            name={isJoined ? "heart" : "heart-o"}
                            size={fontSizes.base}
                            color={isJoined ? colors.brandPurple : colors.white}
                            style={styles.followIcon}
                        />
                        <Text
                            style={[
                                styles.followButtonText,
                                isJoined && styles.followButtonTextActive,
                            ]}
                        >
                            {isJoined ? "Following" : "Follow"}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <EventCalendarView events={communityEvents} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    followButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        shadowColor: colors.shadowLight,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 4,
    },
    followButtonActive: {
        backgroundColor: colors.surfaceWhiteFrosted,
        borderColor: colors.borderLavenderActive,
    },
    followButtonInactive: {
        backgroundColor: colors.brandPurple,
        borderColor: colors.brandPurple,
    },
    followButtonContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    followIcon: {
        marginRight: spacing.xs,
    },
    followButtonText: {
        color: colors.white,
        fontSize: fontSizes.base,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
    followButtonTextActive: {
        color: colors.brandPurple,
    },
});

export default CommunityEvents;
