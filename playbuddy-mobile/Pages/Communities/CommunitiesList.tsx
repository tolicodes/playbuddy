// CommunitiesList.tsx

import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView,
    useWindowDimensions,
    ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import FAIcon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import {
    useFetchMyCommunities,
    useJoinCommunity,
    useLeaveCommunity,
} from "../../Common/hooks/useCommunities";
import { logEvent } from "../../Common/hooks/logger";
import type { Community } from "../../Common/hooks/CommonContext";
import type { Event } from "../../Common/types/commonTypes";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { UE } from "../../userEventTypes";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import { useFetchOrganizers } from "../../Common/db-axios/useOrganizers";
import { WishlistHeart } from "../Calendar/ListView/WishlistHeart";
import { getSmallAvatarUrl } from "../../Common/hooks/imageUtils";
import type { Organizer } from "../../Common/types/commonTypes";

type CommunityMeta = {
    eventCount: number;
    upcomingWeekCount: number;
    imageUrl?: string;
};

type CommunityEntity = {
    id: string;
    name: string;
    communityIds: string[];
    organizerIds: string[];
    primaryCommunity?: Community;
};

const toTimestamp = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.getTime();
};

const normalizeOrganizerName = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/^the\s+/, "");

const SPOTLIGHT_EXCLUDED = new Set([normalizeOrganizerName("The Taillor Group")]);
const COMMUNITY_ICON = "users";

const getEventCountLabel = (count: number) => {
    if (count === 0) return "No events";
    return `${count} ${count === 1 ? "event" : "events"}`;
};

export const CommunitiesList = ({
    title,
    communities,
    showSearch = false,
    entityType = "organizer",
    onPressAllCommunities,
    listMode,
}: {
    title: string;
    communities: Community[];
    showSearch?: boolean;
    entityType?: "private_community" | "organizer";
    onPressAllCommunities?: () => void;
    listMode?: "discover" | "all" | "my";
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId } = useUserContext();
    const { width } = useWindowDimensions();

    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();
    const { data: myCommunities = [] } = useFetchMyCommunities();
    const { data: allEvents = [] } = useFetchEvents();
    const { data: organizers = [] } = useFetchOrganizers();
    const isOrganizer = entityType === "organizer";
    const entityLabel = "communities";
    const organizerListMode = listMode || (showSearch ? "discover" : "my");
    const [searchQuery, setSearchQuery] = useState("");
    const [showNoEventOrganizers, setShowNoEventOrganizers] = useState(false);
    const searchPlaceholder =
        isOrganizer && organizerListMode === "my"
            ? "Search my communities..."
            : `Search ${entityLabel}...`;
    const tileWidth = Math.max(148, Math.floor((width - 32 - 12) / 2));
    const tileHeight = Math.round(tileWidth * 0.9);
    const spotlightCardWidth = Math.max(240, Math.min(320, Math.floor(width * 0.72)));
    const spotlightCardHeight = Math.round(spotlightCardWidth * 0.62);
    const shelfCardWidth = Math.max(200, Math.min(240, Math.floor(width * 0.58)));
    const shelfCardHeight = Math.round(shelfCardWidth * 0.85);

    const myCommunityIds = useMemo(
        () => new Set(myCommunities.map((community) => community.id)),
        [myCommunities]
    );

    const toggleMembership = useCallback(
        (communityIds: string[], shouldJoin: boolean) => {
            if (communityIds.length === 0) return;
            if (!authUserId) {
                alert('Create an account to join a community!');
                return;
            }
            const targetIds = shouldJoin
                ? communityIds.filter((id) => !myCommunityIds.has(id))
                : communityIds.filter((id) => myCommunityIds.has(id));

            targetIds.forEach((communityId) => {
                if (shouldJoin) {
                    joinCommunity.mutate({
                        community_id: communityId,
                        type: entityType === "organizer"
                            ? "organizer_public_community"
                            : "private_community",
                    });
                    logEvent(UE.CommunityListCommunityJoined, { community_id: communityId });
                } else {
                    leaveCommunity.mutate({ community_id: communityId });
                    logEvent(UE.CommunityListCommunityLeft, { community_id: communityId });
                }
            });
        },
        [authUserId, entityType, joinCommunity, leaveCommunity, myCommunityIds]
    );

    const communityEntities = useMemo<CommunityEntity[]>(() => {
        if (!isOrganizer) {
            return communities.map((community) => ({
                id: community.id,
                name: community.name,
                communityIds: [community.id],
                organizerIds: community.organizer_id ? [community.organizer_id] : [],
                primaryCommunity: community,
            }));
        }

        const communitiesByOrganizer = new Map<string, Community[]>();
        for (const community of communities) {
            const organizerId = community.organizer_id?.toString();
            if (!organizerId) continue;
            const list = communitiesByOrganizer.get(organizerId) || [];
            list.push(community);
            communitiesByOrganizer.set(organizerId, list);
        }

        const grouped = new Map<
            string,
            {
                nameCandidates: string[];
                organizerIds: Set<string>;
                communityIds: Set<string>;
                primaryCommunity?: Community;
            }
        >();

        const addCommunity = (entry: {
            nameCandidates: string[];
            organizerIds: Set<string>;
            communityIds: Set<string>;
            primaryCommunity?: Community;
        }, community: Community) => {
            entry.communityIds.add(community.id);
            if (!entry.primaryCommunity) {
                entry.primaryCommunity = community;
            }
        };

        const addOrganizerGroup = (name: string, organizerId?: string) => {
            const key = normalizeOrganizerName(name) || organizerId || name;
            const entry = grouped.get(key) || {
                nameCandidates: [],
                organizerIds: new Set<string>(),
                communityIds: new Set<string>(),
                primaryCommunity: undefined,
            };
            if (name) entry.nameCandidates.push(name);
            if (organizerId) entry.organizerIds.add(organizerId);

            if (organizerId) {
                const organizerCommunities = communitiesByOrganizer.get(organizerId) || [];
                organizerCommunities.forEach((community) => addCommunity(entry, community));
            }

            grouped.set(key, entry);
        };

        const organizerIdsFromEndpoint = new Set<string>();
        if (organizers.length > 0) {
            organizers.forEach((organizer: Organizer) => {
                const organizerId = organizer.id?.toString();
                if (organizerId) organizerIdsFromEndpoint.add(organizerId);
                addOrganizerGroup(organizer.name || "Organizer", organizerId);
            });
        }

        communities.forEach((community) => {
            const organizerId = community.organizer_id?.toString();
            if (organizerId && organizerIdsFromEndpoint.has(organizerId)) return;
            const keyName = community.name || "Organizer";
            addOrganizerGroup(keyName, organizerId);
            const key = normalizeOrganizerName(keyName) || organizerId || community.id;
            const entry = grouped.get(key);
            if (entry) addCommunity(entry, community);
        });

        return Array.from(grouped.entries()).map(([key, entry]) => {
            const sortedNames = entry.nameCandidates
                .map((name) => name.trim())
                .filter(Boolean)
                .sort((a, b) => {
                    const lenDiff = a.length - b.length;
                    if (lenDiff !== 0) return lenDiff;
                    return a.localeCompare(b);
                });
            const name = sortedNames[0] || "Organizer";
            return {
                id: key,
                name,
                communityIds: Array.from(entry.communityIds),
                organizerIds: Array.from(entry.organizerIds),
                primaryCommunity: entry.primaryCommunity,
            };
        });
    }, [communities, isOrganizer, organizers]);

    const entityMeta = useMemo(() => {
        const nowTs = Date.now();
        const entityIdByCommunityId = new Map<string, string>();
        const entityIdByOrganizerId = new Map<string, string>();
        const eventsByEntity = new Map<string, Map<number, Event>>();

        for (const entity of communityEntities) {
            for (const communityId of entity.communityIds) {
                entityIdByCommunityId.set(communityId, entity.id);
            }
            for (const organizerId of entity.organizerIds) {
                entityIdByOrganizerId.set(organizerId, entity.id);
            }
        }

        for (const event of allEvents) {
            const organizerId = event.organizer?.id?.toString();
            if (organizerId) {
                const entityId = entityIdByOrganizerId.get(organizerId);
                if (entityId) {
                    const entityEvents = eventsByEntity.get(entityId) || new Map<number, Event>();
                    entityEvents.set(event.id, event);
                    eventsByEntity.set(entityId, entityEvents);
                }
            }
            for (const community of event.communities || []) {
                const entityId = entityIdByCommunityId.get(community.id);
                if (!entityId) continue;
                const entityEvents = eventsByEntity.get(entityId) || new Map<number, Event>();
                entityEvents.set(event.id, event);
                eventsByEntity.set(entityId, entityEvents);
            }
        }

        const metaMap = new Map<string, CommunityMeta>();
        for (const entity of communityEntities) {
            const eventsMap = eventsByEntity.get(entity.id);
            const events = eventsMap ? Array.from(eventsMap.values()) : [];
            const upcoming = events
                .map((event) => ({ event, ts: toTimestamp(event.start_date) }))
                .filter((entry): entry is { event: Event; ts: number } => entry.ts !== null)
                .filter((entry) => entry.ts >= nowTs)
                .sort((a, b) => a.ts - b.ts);
            const upcomingWeekCount = upcoming.filter(
                (entry) => entry.ts <= nowTs + 7 * 24 * 60 * 60 * 1000
            ).length;
            const imageUrl =
                upcoming.find((entry) => entry.event.image_url)?.event.image_url ||
                events.find((event) => event.image_url)?.image_url;
            metaMap.set(entity.id, {
                eventCount: events.length,
                upcomingWeekCount,
                imageUrl,
            });
        }

        return metaMap;
    }, [allEvents, communityEntities]);

    // Filter by search and event availability
    const filteredEntities = useMemo(() => {
        const normalizedSearch = searchQuery.toLowerCase().trim();
        return communityEntities
            .filter((entity) =>
                entity.name.toLowerCase().includes(normalizedSearch)
            )
            .filter(
                (entity) =>
                    showNoEventOrganizers ||
                    (entityMeta.get(entity.id)?.eventCount || 0) > 0
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [communityEntities, searchQuery, showNoEventOrganizers, entityMeta]);

    const isEntityJoined = useCallback(
        (entity: CommunityEntity) => entity.communityIds.some((id) => myCommunityIds.has(id)),
        [myCommunityIds]
    );

    const myOrganizerCommunities = useMemo(() => {
        if (!isOrganizer) return [];
        return filteredEntities.filter(isEntityJoined);
    }, [filteredEntities, isOrganizer, isEntityJoined]);

    const discoverCommunities = useMemo(() => {
        if (!isOrganizer) return filteredEntities;
        if (organizerListMode !== "discover") return filteredEntities;
        return filteredEntities.filter((entity) => !isEntityJoined(entity));
    }, [filteredEntities, isOrganizer, organizerListMode, isEntityJoined]);

    const spotlightCommunities = useMemo(() => {
        if (!isOrganizer) return [];
        return [...filteredEntities]
            .map((entity) => ({
                entity,
                meta: entityMeta.get(entity.id),
            }))
            .filter((entry): entry is { entity: CommunityEntity; meta: CommunityMeta } => !!entry.meta)
            .filter((entry) => !SPOTLIGHT_EXCLUDED.has(normalizeOrganizerName(entry.entity.name)))
            .sort((a, b) => {
                if (b.meta.upcomingWeekCount !== a.meta.upcomingWeekCount) {
                    return b.meta.upcomingWeekCount - a.meta.upcomingWeekCount;
                }
                if (b.meta.eventCount !== a.meta.eventCount) {
                    return b.meta.eventCount - a.meta.eventCount;
                }
                return a.entity.name.localeCompare(b.entity.name);
            })
            .slice(0, 3);
    }, [entityMeta, filteredEntities, isOrganizer]);

    const getMetaForEntity = useCallback(
        (entity: CommunityEntity): CommunityMeta => {
            return (
                entityMeta.get(entity.id) || {
                    eventCount: 0,
                    upcomingWeekCount: 0,
                    imageUrl: undefined,
                }
            );
        },
        [entityMeta]
    );

    const handlePressEntity = useCallback(
        (entity: CommunityEntity) => {
            const communityId =
                entity.primaryCommunity?.id ||
                entity.communityIds[0] ||
                `organizer-${entity.organizerIds[0] || entity.id}`;
            const organizerId =
                entity.organizerIds[0] || entity.primaryCommunity?.organizer_id;
            navigation.navigate("Community Events", {
                communityId,
                communityIds: entity.communityIds,
                displayName: entity.name,
                organizerId,
            });
            const logCommunityId = entity.primaryCommunity?.id || entity.communityIds[0];
            if (logCommunityId) {
                logEvent(UE.CommunityListNavigateToCommunityEvents, { community_id: logCommunityId });
            }
        },
        [navigation]
    );

    const listLabel = isOrganizer
        ? title || (organizerListMode === "discover" ? "Discover" : organizerListMode === "my" ? "My Communities" : "Communities")
        : title;
    const listData = isOrganizer
        ? organizerListMode === "my"
            ? myOrganizerCommunities
            : organizerListMode === "discover"
                ? discoverCommunities
                : filteredEntities
        : filteredEntities;
    const useGridLayout = isOrganizer;

    const renderImageTile = (
        entity: CommunityEntity,
        meta: CommunityMeta,
        options: {
            width: number;
            height: number;
            badgeLabel?: string;
            titleStyle?: object;
            containerStyle?: ViewStyle;
        }
    ) => {
        const isJoined = isEntityJoined(entity);
        const canFollow = entity.communityIds.length > 0;
        const imageUrl = meta.imageUrl ? getSmallAvatarUrl(meta.imageUrl) : null;
        const badgeLabel = options.badgeLabel || getEventCountLabel(meta.eventCount);
        return (
            <TouchableOpacity
                key={`tile-${entity.id}-${options.width}`}
                style={[
                    styles.imageTile,
                    { width: options.width, height: options.height },
                    options.containerStyle,
                ]}
                activeOpacity={0.9}
                onPress={() => handlePressEntity(entity)}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.imageTileImage} contentFit="cover" />
                ) : isOrganizer ? (
                    <LinearGradient
                        colors={["#F1ECFF", "#D7CCFF"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.imageTileImage, styles.imageTilePlaceholder]}
                    >
                        <FAIcon name={COMMUNITY_ICON} size={32} color="#6B57D0" />
                    </LinearGradient>
                ) : (
                    <LinearGradient
                        colors={["#E5E7EB", "#C7CBD6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.imageTileImage}
                    />
                )}
                <LinearGradient
                    colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.6)"]}
                    style={styles.imageTileOverlay}
                />
                <View style={styles.imageTileBadge}>
                    <Text style={styles.imageTileBadgeText}>{badgeLabel}</Text>
                </View>
                {canFollow && (
                    <WishlistHeart
                        itemIsOnWishlist={isJoined}
                        handleToggleEventWishlist={() => {
                            toggleMembership(entity.communityIds, !isJoined);
                        }}
                        size={20}
                        containerStyle={styles.imageTileHeart}
                    />
                )}
                <View style={styles.imageTileFooter}>
                    <Text style={[styles.imageTileTitle, options.titleStyle]} numberOfLines={2}>
                        {entity.name}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // NOT filtered communities otherwise search doesn't show
    if (communities.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.centeredView}>
                    <Text style={styles.emptyMessage}>
                        You’re not following any communities yet.
                    </Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => {
                            onPressAllCommunities?.();
                            logEvent(
                                UE.CommunityListNavigateToJoinCommunityButtonPressed
                            );
                        }}
                    >
                        <Text style={styles.ctaButtonText}>
                            {entityType === "private_community"
                                ? "Join a Community"
                                : "Follow a Community"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const controlsCard = (
        <View style={styles.controlsCard}>
            {showSearch && (
                <View style={styles.searchRow}>
                    <FAIcon name="search" size={14} color="#7B7B88" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={searchPlaceholder}
                        placeholderTextColor="#8B8B97"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                    />
                </View>
            )}

            <View style={[styles.filterRow, showSearch && styles.filterRowWithSearch]}>
                <Text style={styles.filterLabel}>Show</Text>
                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        showNoEventOrganizers && styles.filterChipActive,
                    ]}
                    onPress={() => setShowNoEventOrganizers((prev) => !prev)}
                >
                    {showNoEventOrganizers && (
                        <FAIcon name="check" size={10} color="#5A43B5" style={styles.filterChipIcon} />
                    )}
                    <Text
                        style={[
                            styles.filterChipText,
                            showNoEventOrganizers && styles.filterChipTextActive,
                        ]}
                    >
                        No events
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const spotlightSection = isOrganizer && spotlightCommunities.length > 0 ? (
        <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
                <Text style={isOrganizer ? styles.sectionHeaderLight : styles.sectionHeader}>Community Spotlight</Text>
                <Text style={isOrganizer ? styles.sectionSubHeaderLight : styles.sectionSubHeader}>Next 7 days</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spotlightRow}
            >
                {spotlightCommunities.map(({ entity, meta }) => {
                    const badgeLabel =
                        meta.upcomingWeekCount > 0
                            ? `${meta.upcomingWeekCount} in 7 days`
                            : "No events in 7 days";
                    return renderImageTile(entity, meta, {
                        width: spotlightCardWidth,
                        height: spotlightCardHeight,
                        badgeLabel,
                        titleStyle: styles.imageTileTitleLarge,
                        containerStyle: styles.imageTileHorizontal,
                    });
                })}
            </ScrollView>
        </View>
    ) : null;

    const myShelfSection = isOrganizer && organizerListMode === "discover" && myOrganizerCommunities.length > 0 ? (
        <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
                <Text style={isOrganizer ? styles.sectionHeaderLight : styles.sectionHeader}>My Communities</Text>
                <Text style={isOrganizer ? styles.sectionCountLight : styles.sectionCount}>{myOrganizerCommunities.length}</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shelfRow}
            >
                {myOrganizerCommunities.map((entity) => {
                    const meta = getMetaForEntity(entity);
                    return renderImageTile(entity, meta, {
                        width: shelfCardWidth,
                        height: shelfCardHeight,
                        containerStyle: styles.imageTileHorizontal,
                    });
                })}
            </ScrollView>
        </View>
    ) : null;

    const renderCommunityItem = ({ item }: { item: CommunityEntity }) => {
        const meta = getMetaForEntity(item);
        const hasEvents = meta.eventCount > 0;
        const eventCountLabel = getEventCountLabel(meta.eventCount);

        if (!isOrganizer) {
            const isJoined = isEntityJoined(item);
            return (
                <TouchableOpacity
                    style={[
                        styles.communityItem,
                        !hasEvents && styles.communityItemMuted,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handlePressEntity(item)}
                >
                    <View style={styles.itemContent}>
                        <View style={[styles.iconBadge, !hasEvents && styles.iconBadgeMuted]}>
                            <FAIcon
                                name={COMMUNITY_ICON}
                                size={18}
                                color={hasEvents ? "#6B57D0" : "#8E8E9B"}
                            />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.communityName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={[styles.eventCountPill, !hasEvents && styles.eventCountPillMuted]}>
                                <Text style={[styles.eventCountText, !hasEvents && styles.eventCountTextMuted]}>
                                    {eventCountLabel}
                                </Text>
                            </View>
                        </View>

                        <WishlistHeart
                            itemIsOnWishlist={isJoined}
                            handleToggleEventWishlist={() => {
                                toggleMembership(item.communityIds, !isJoined);
                            }}
                            containerStyle={styles.heartButton}
                        />
                    </View>
                </TouchableOpacity>
            );
        }

        return renderImageTile(item, meta, {
            width: tileWidth,
            height: tileHeight,
            badgeLabel: eventCountLabel,
        });
    };

    const listHeader = (
        <View>
            {controlsCard}
            {spotlightSection}
            {myShelfSection}
            {listData.length > 0 && listLabel ? (
                <View style={styles.sectionHeaderRow}>
                    <Text style={isOrganizer ? styles.sectionHeaderLight : styles.sectionHeader}>{listLabel}</Text>
                    <Text style={isOrganizer ? styles.sectionCountLight : styles.sectionCount}>{listData.length} {entityLabel}</Text>
                </View>
            ) : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                key={useGridLayout ? "organizer-grid" : "organizer-list"}
                data={listData}
                keyExtractor={(item) => item.id}
                renderItem={renderCommunityItem}
                numColumns={useGridLayout ? 2 : 1}
                columnWrapperStyle={useGridLayout ? styles.gridRow : undefined}
                ListHeaderComponent={listHeader}
                contentContainerStyle={useGridLayout ? styles.gridContent : styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyList}>
                        <Text style={styles.emptyListText}>No {entityLabel} found.</Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: 16,
    },
    controlsCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        padding: 12,
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E6E0F5",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#F7F5FF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E6E0F5",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#2C2C34",
        paddingVertical: 0,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    filterRowWithSearch: {
        marginTop: 10,
    },
    filterLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
        marginRight: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#F0ECFF",
        borderWidth: 1,
        borderColor: "#E1DAF7",
    },
    filterChipActive: {
        backgroundColor: "#E7DEFF",
        borderColor: "#CFC2FF",
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#5A43B5",
    },
    filterChipTextActive: {
        color: "#4B2ABF",
    },
    filterChipIcon: {
        marginRight: 6,
    },
    sectionBlock: {
        marginBottom: 10,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginBottom: 8,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#2C2C34",
    },
    sectionHeaderLight: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    sectionSubHeader: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
    },
    sectionSubHeaderLight: {
        fontSize: 12,
        fontWeight: "600",
        color: "rgba(255,255,255,0.8)",
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
    },
    sectionCountLight: {
        fontSize: 12,
        fontWeight: "600",
        color: "rgba(255,255,255,0.8)",
    },
    spotlightRow: {
        paddingHorizontal: 16,
        paddingBottom: 4,
        paddingRight: 28,
    },
    shelfRow: {
        paddingHorizontal: 16,
        paddingBottom: 6,
        paddingRight: 28,
    },
    imageTile: {
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 0,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 4,
    },
    imageTileHorizontal: {
        marginRight: 12,
    },
    imageTileImage: {
        width: "100%",
        height: "100%",
    },
    imageTilePlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    imageTileOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    imageTileBadge: {
        position: "absolute",
        left: 12,
        top: 12,
        backgroundColor: "rgba(255,255,255,0.9)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    imageTileBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#3F3F46",
    },
    imageTileHeart: {
        position: "absolute",
        right: 10,
        top: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.9)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.8)",
        alignItems: "center",
        justifyContent: "center",
    },
    imageTileFooter: {
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
    },
    imageTileTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    imageTileTitleLarge: {
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 24,
    },
    gridContent: {
        paddingBottom: 32,
    },
    gridRow: {
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    emptyList: {
        paddingVertical: 24,
        alignItems: "center",
    },
    emptyListText: {
        fontSize: 14,
        color: "#FFFFFF",
    },
    communityItem: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E7E1F8",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
    },
    communityItemMuted: {
        backgroundColor: "#F6F4FA",
        borderColor: "#E2E0EA",
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#F3EEFF",
        borderWidth: 1,
        borderColor: "#E2D9FF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    iconBadgeMuted: {
        backgroundColor: "#ECECF3",
        borderColor: "#E0E0EA",
    },
    textContainer: {
        flex: 1,
        justifyContent: "center",
    },
    communityName: {
        fontSize: 17,
        fontWeight: "700",
        color: "#2C2C34",
    },
    eventCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#5A43B5",
    },
    eventCountTextMuted: {
        color: "#6B7280",
    },
    eventCountPill: {
        alignSelf: "flex-start",
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "#F3EEFF",
        borderWidth: 1,
        borderColor: "#E2D9FF",
    },
    eventCountPillMuted: {
        backgroundColor: "#ECECF3",
        borderColor: "#DCDCE6",
    },
    heartButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#F2B8C0",
        backgroundColor: "#FFF1F2",
        alignItems: "center",
        justifyContent: "center",
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
        color: "white",
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
