// CommunitiesList.tsx

import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { getSafeImageUrl, getSmallAvatarUrl } from "../../Common/hooks/imageUtils";
import type { Organizer } from "../../Common/types/commonTypes";
import { colors, fontFamilies, fontSizes, gradients, radius, spacing } from "../../components/styles";

type CommunityMeta = {
    eventCount: number;
    upcomingWeekCount: number;
    imageUrl?: string;
    hasOrganizerPromo: boolean;
    hasEventPromo: boolean;
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

const hasOrganizerPromo = (events: Event[]) =>
    events.some((event) =>
        event.organizer?.promo_codes?.some((code) => code.scope === "organizer")
    );

const hasEventPromo = (events: Event[]) =>
    events.some((event) =>
        event.promo_codes?.some((code) => code.scope === "event")
    );

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const getJoinableCommunityIds = (communityIds: string[]) =>
    communityIds.filter((id) => isUuid(id));

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

    useEffect(() => {
        if (!__DEV__ || !isOrganizer) return;
        const organizerIds = new Set(
            organizers
                .map((organizer) => organizer.id?.toString())
                .filter((id): id is string => Boolean(id))
        );
        const communityOrganizerIds = new Set(
            communities
                .map((community) => community.organizer_id?.toString())
                .filter((id): id is string => Boolean(id))
        );
        const missingOrganizerIds = Array.from(organizerIds).filter(
            (id) => !communityOrganizerIds.has(id)
        );
        const sampleMissingOrganizerIds = missingOrganizerIds.slice(0, 10);
        const missingOrganizerIdCommunities = communities
            .filter((community) => !community.organizer_id)
            .slice(0, 5)
            .map((community) => community.id);
        console.log('[communities][match]', {
            organizers: organizerIds.size,
            communityRows: communities.length,
            communityOrganizerIds: communityOrganizerIds.size,
            missingOrganizerIds: missingOrganizerIds.length,
            sampleMissingOrganizerIds,
            missingOrganizerIdCommunities,
        });
    }, [communities, isOrganizer, organizers]);

    const myCommunityIds = useMemo(
        () => new Set(myCommunities.map((community) => community.id)),
        [myCommunities]
    );
    const toggleMembership = useCallback(
        (communityIds: string[], shouldJoin: boolean) => {
            const validCommunityIds = getJoinableCommunityIds(communityIds);
            if (validCommunityIds.length === 0) {
                return;
            }
            if (!authUserId) {
                alert('Create an account to join a community!');
                return;
            }
            const targetIds = shouldJoin
                ? validCommunityIds.filter((id) => !myCommunityIds.has(id))
                : validCommunityIds.filter((id) => myCommunityIds.has(id));

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
                hasOrganizerPromo: hasOrganizerPromo(events),
                hasEventPromo: hasEventPromo(events),
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
        (entity: CommunityEntity) => {
            const validIds = getJoinableCommunityIds(entity.communityIds);
            if (validIds.length > 0) {
                return validIds.some((id) => myCommunityIds.has(id));
            }
            return false;
        },
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
        const candidates = [...filteredEntities]
            .map((entity) => ({
                entity,
                meta: entityMeta.get(entity.id),
            }))
            .filter((entry): entry is { entity: CommunityEntity; meta: CommunityMeta } => !!entry.meta)
            .filter((entry) => !SPOTLIGHT_EXCLUDED.has(normalizeOrganizerName(entry.entity.name)));

        const sortedCandidates = [...candidates].sort((a, b) => {
            if (b.meta.upcomingWeekCount !== a.meta.upcomingWeekCount) {
                return b.meta.upcomingWeekCount - a.meta.upcomingWeekCount;
            }
            if (b.meta.eventCount !== a.meta.eventCount) {
                return b.meta.eventCount - a.meta.eventCount;
            }
            return a.entity.name.localeCompare(b.entity.name);
        });

        const organizerPromoCandidates = sortedCandidates.filter(
            (entry) => entry.meta.hasOrganizerPromo
        );
        const spotlight = organizerPromoCandidates.slice(0, 5);
        const selectedIds = new Set(spotlight.map((entry) => entry.entity.id));

        if (spotlight.length < 5) {
            for (const entry of sortedCandidates) {
                if (spotlight.length >= 5) break;
                if (selectedIds.has(entry.entity.id)) continue;
                spotlight.push(entry);
                selectedIds.add(entry.entity.id);
            }
        }

        if (!spotlight.some((entry) => entry.meta.hasEventPromo)) {
            const eventPromoCandidate =
                organizerPromoCandidates.find((entry) => entry.meta.hasEventPromo) ||
                sortedCandidates.find((entry) => entry.meta.hasEventPromo);
            if (eventPromoCandidate && !selectedIds.has(eventPromoCandidate.entity.id)) {
                if (spotlight.length < 5) {
                    spotlight.push(eventPromoCandidate);
                } else {
                    const replaceIndex = spotlight.findIndex(
                        (entry) => !entry.meta.hasOrganizerPromo
                    );
                    spotlight[replaceIndex >= 0 ? replaceIndex : spotlight.length - 1] =
                        eventPromoCandidate;
                }
            }
        }

        return spotlight;
    }, [entityMeta, filteredEntities, isOrganizer]);

    const getMetaForEntity = useCallback(
        (entity: CommunityEntity): CommunityMeta => {
            return (
                entityMeta.get(entity.id) || {
                    eventCount: 0,
                    upcomingWeekCount: 0,
                    imageUrl: undefined,
                    hasOrganizerPromo: false,
                    hasEventPromo: false,
        }
    );
        },
        [entityMeta]
    );

    const handlePressEntity = useCallback(
        (entity: CommunityEntity) => {
            const joinableCommunityIds = getJoinableCommunityIds(entity.communityIds);
            const communityId =
                entity.primaryCommunity?.id ||
                joinableCommunityIds[0] ||
                entity.communityIds[0] ||
                entity.organizerIds[0] ||
                entity.id;
            const organizerId =
                entity.organizerIds[0] || entity.primaryCommunity?.organizer_id;
            navigation.navigate("Community Events", {
                communityId,
                communityIds: joinableCommunityIds,
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
        const joinableCommunityIds = getJoinableCommunityIds(entity.communityIds);
        const canFollow = joinableCommunityIds.length > 0;
        const heartSize = Math.max(44, Math.min(56, Math.round(options.height * 0.34)));
        const imageUrl = getSafeImageUrl(meta.imageUrl ? getSmallAvatarUrl(meta.imageUrl) : undefined);
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
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.imageTileImage}
                        contentFit="cover"
                        cachePolicy="disk"
                        allowDownscaling
                        decodeFormat="rgb"
                    />
                ) : isOrganizer ? (
                    <LinearGradient
                        colors={gradients.communityOrganizer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.imageTileImage, styles.imageTilePlaceholder]}
                    >
                        <FAIcon name={COMMUNITY_ICON} size={spacing.xxxl} color={colors.brandIndigo} />
                    </LinearGradient>
                ) : (
                    <LinearGradient
                        colors={gradients.communityNeutral}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.imageTileImage}
                    />
                )}
                <LinearGradient
                    colors={[colors.overlaySoft, colors.overlayHeavy]}
                    style={styles.imageTileOverlay}
                />
                <View style={styles.imageTileBadge}>
                    <Text style={styles.imageTileBadgeText}>{badgeLabel}</Text>
                </View>
                <View style={styles.imageTileHeartWrap} pointerEvents="box-none">
                    <WishlistHeart
                        itemIsOnWishlist={isJoined}
                        handleToggleEventWishlist={() => {
                            if (!canFollow) {
                                alert('This community is not followable yet.');
                                return;
                            }
                            toggleMembership(entity.communityIds, !isJoined);
                        }}
                        size={heartSize}
                        variant={isJoined ? "solid" : "outline"}
                        containerStyle={[
                            styles.imageTileHeart,
                            !canFollow && styles.heartDisabled,
                        ]}
                    />
                </View>
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
                    <FAIcon name="search" size={fontSizes.base} color={colors.textSlate} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={colors.textNightSubtle}
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
                        <FAIcon name="check" size={fontSizes.xxs} color={colors.brandPurpleDark} style={styles.filterChipIcon} />
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
            const joinableCommunityIds = getJoinableCommunityIds(item.communityIds);
            const canFollow = joinableCommunityIds.length > 0;
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
                                size={fontSizes.xxl}
                                color={hasEvents ? colors.brandIndigo : colors.textNightSubtle}
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
                                if (!canFollow) {
                                    alert('This community is not followable yet.');
                                    return;
                                }
                                toggleMembership(item.communityIds, !isJoined);
                            }}
                            variant={isJoined ? "solid" : "outline"}
                            containerStyle={[
                                styles.heartButton,
                                !canFollow && styles.heartDisabled,
                            ]}
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
        paddingTop: spacing.lg,
    },
    controlsCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.mdPlus,
        padding: spacing.md,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceLavenderLight,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSizes.lg,
        color: colors.textDeep,
        paddingVertical: 0,
        fontFamily: fontFamilies.body,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    filterRowWithSearch: {
        marginTop: spacing.smPlus,
    },
    filterLabel: {
        fontSize: fontSizes.sm,
        color: colors.textSlate,
        fontWeight: "600",
        marginRight: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xsPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavender,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
    },
    filterChipActive: {
        backgroundColor: colors.surfaceLavenderStrong,
        borderColor: colors.borderLavenderActive,
    },
    filterChipText: {
        fontSize: fontSizes.sm,
        fontWeight: "600",
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    filterChipTextActive: {
        color: colors.brandPurple,
    },
    filterChipIcon: {
        marginRight: spacing.xsPlus,
    },
    sectionBlock: {
        marginBottom: spacing.smPlus,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    sectionHeader: {
        fontSize: fontSizes.xl,
        fontWeight: "700",
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
    },
    sectionHeaderLight: {
        fontSize: fontSizes.xl,
        fontWeight: "700",
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    sectionSubHeader: {
        fontSize: fontSizes.sm,
        fontWeight: "600",
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    sectionSubHeaderLight: {
        fontSize: fontSizes.sm,
        fontWeight: "600",
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    sectionCount: {
        fontSize: fontSizes.sm,
        fontWeight: "600",
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    sectionCountLight: {
        fontSize: fontSizes.sm,
        fontWeight: "600",
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    spotlightRow: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xs,
        paddingRight: spacing.xxl,
    },
    shelfRow: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xsPlus,
        paddingRight: spacing.xxl,
    },
    imageTile: {
        borderRadius: radius.lgPlus,
        overflow: "hidden",
        marginBottom: 0,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        shadowColor: colors.black,
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 4,
    },
    imageTileHorizontal: {
        marginRight: spacing.md,
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
        left: spacing.md,
        top: spacing.md,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
    },
    imageTileBadgeText: {
        fontSize: fontSizes.xs,
        fontWeight: "700",
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    imageTileHeartWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    imageTileHeart: {
        backgroundColor: "transparent",
        borderWidth: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    imageTileFooter: {
        position: "absolute",
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
    },
    imageTileTitle: {
        fontSize: fontSizes.base,
        fontWeight: "700",
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    imageTileTitleLarge: {
        fontSize: fontSizes.xl,
    },
    listContent: {
        paddingBottom: spacing.xxl,
    },
    gridContent: {
        paddingBottom: spacing.xxxl,
    },
    gridRow: {
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    emptyList: {
        paddingVertical: spacing.xxl,
        alignItems: "center",
    },
    emptyListText: {
        fontSize: fontSizes.base,
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    communityItem: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.mdPlus,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
    },
    communityItemMuted: {
        backgroundColor: colors.surfaceMutedLight,
        borderColor: colors.borderMutedLight,
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceLavenderAlt,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    iconBadgeMuted: {
        backgroundColor: colors.surfaceMutedAlt,
        borderColor: colors.borderMutedAlt,
    },
    textContainer: {
        flex: 1,
        justifyContent: "center",
    },
    communityName: {
        fontSize: fontSizes.xl,
        fontWeight: "700",
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
    },
    eventCountText: {
        fontSize: fontSizes.sm,
        fontWeight: "600",
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    eventCountTextMuted: {
        color: colors.textSlate,
    },
    eventCountPill: {
        alignSelf: "flex-start",
        marginTop: spacing.xsPlus,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderAlt,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    eventCountPillMuted: {
        backgroundColor: colors.surfaceMutedAlt,
        borderColor: colors.borderMutedDark,
    },
    heartButton: {
        width: spacing.jumbo,
        height: spacing.jumbo,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderRose,
        backgroundColor: colors.surfaceRoseSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    heartDisabled: {
        opacity: 0.45,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xxl,
    },
    emptyMessage: {
        fontSize: fontSizes.xl,
        color: colors.white,
        textAlign: "center",
        marginBottom: spacing.xl,
        fontFamily: fontFamilies.body,
    },
    ctaButton: {
        backgroundColor: colors.linkBlue,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.smPlus,
        borderRadius: radius.smPlus,
    },
    ctaButtonText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
});
