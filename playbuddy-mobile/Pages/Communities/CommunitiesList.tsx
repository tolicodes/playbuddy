// CommunitiesList.tsx

import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Switch,
    Dimensions,
} from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import {
    useFetchMyCommunities,
    useJoinCommunity,
    useLeaveCommunity,
} from "../../Common/hooks/useCommunities";
import { logEvent } from "../../Common/hooks/logger";
import type { Community } from "../../Common/hooks/CommonContext";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { UE } from "../../commonTypes";
import { LAVENDER_BACKGROUND } from "../../components/styles";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useFetchEvents } from "../../Common/db-axios/useEvents";

export const CommunitiesList = ({
    title,
    communities,
    showSearch = false,
    entityType = "organizer",
}: {
    title: string;
    communities: Community[];
    showSearch?: boolean;
    entityType?: "private_community" | "organizer";
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId } = useUserContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [showNoEventOrganizers, setShowNoEventOrganizers] = useState(false);

    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();
    const { data: myCommunities = [] } = useFetchMyCommunities();
    const { data: allEvents = [] } = useFetchEvents();

    const handleJoin = useCallback(
        (communityId: string) => {
            if (!authUserId) {
                alert('Create an account to join a community!')
                return;
            }
            joinCommunity.mutate({
                community_id: communityId,
                type:
                    entityType === "organizer"
                        ? "organizer_public_community"
                        : "private_community",
            });
            logEvent("community_list_community_joined", { communityId });
        },
        [joinCommunity, entityType]
    );

    const handleLeave = useCallback(
        (communityId: string) => {
            leaveCommunity.mutate({ community_id: communityId });
            logEvent("community_list_community_left", { communityId });
        },
        [leaveCommunity]
    );

    // Filter by search and event availability
    const filteredCommunities = useMemo(() => {
        return communities
            .filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
            )
            .filter(
                (c) =>
                    showNoEventOrganizers ||
                    allEvents.some((e) =>
                        e.communities?.some((cc) => cc.id === c.id)
                    )
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [communities, searchQuery, showNoEventOrganizers, allEvents]);

    // NOT filtered communities otherwise search doesn't show
    if (communities.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.centeredView}>
                    <Text style={styles.emptyMessage}>
                        You’re not following any{" "}
                        {entityType === "private_community"
                            ? "communities"
                            : "organizers"}{" "}
                        yet.
                    </Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => {
                            navigation.navigate("Communities", {
                                screen: "Join Community",
                            });
                            logEvent(
                                "community_list_navigate_to_join_community_button_pressed"
                            );
                        }}
                    >
                        <Text style={styles.ctaButtonText}>
                            {entityType === "private_community"
                                ? "Join Community"
                                : "Follow Organizer"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {showSearch && (
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${entityType === "private_community" ? "communities" : "organizers"
                        }...`}
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                />
            )}

            <View style={styles.filterRow}>
                <Text style={styles.filterText}>Show with no events</Text>
                <Switch
                    value={showNoEventOrganizers}
                    onValueChange={setShowNoEventOrganizers}
                />
            </View>

            <FlatList
                data={filteredCommunities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isJoined = myCommunities.some((c) => c.id === item.id);
                    const eventCount = allEvents.filter((e) =>
                        e.communities?.some((cc) => cc.id === item.id)
                    ).length;

                    return (
                        <TouchableOpacity
                            style={[
                                styles.communityItem,
                                { backgroundColor: eventCount > 0 ? "#fff" : "#F0F0F5" },
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                navigation.navigate("Community Events", {
                                    communityId: item.id,
                                });
                                logEvent(UE.CommunityListNavigateToCommunityEvents, {
                                    communityId: item.id,
                                });
                            }}
                        >
                            <View style={styles.itemContent}>
                                {/* Organizer Icon */}
                                <FAIcon
                                    name="building"
                                    size={28}
                                    color="#666"
                                    style={styles.organizerIcon}
                                />

                                <View style={styles.textContainer}>
                                    <Text style={styles.communityName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    {/* Number of events underneath */}
                                    <Text style={styles.eventCountText}>
                                        {eventCount} {eventCount === 1 ? "event" : "events"}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.heartButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        isJoined ? handleLeave(item.id) : handleJoin(item.id);
                                    }}
                                >
                                    <FAIcon
                                        name={isJoined ? "heart" : "heart-o"}
                                        size={32}
                                        color={isJoined ? "#FF6B6B" : "#666"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LAVENDER_BACKGROUND,
        paddingTop: 20,
    },
    searchInput: {
        height: 44,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#DDD",
        fontSize: 16,
        color: "#333",
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginBottom: 12,
    },
    filterText: {
        fontSize: 14,
        color: "#555",
    },
    communityItem: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    organizerIcon: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: "center",
    },
    communityName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
    },
    eventCountText: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    heartButton: {
        marginLeft: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    emptyMessage: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    ctaButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    ctaButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
