import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Dimensions,
    Platform,
} from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { LAVENDER_BACKGROUND } from "../../styles";
import { useUserContext } from "../Auth/hooks/UserContext";
import { logEvent } from "../../Common/hooks/logger";
import { useFetchMunches } from "../../Common/db-axios/useMunches";

export const MunchesScreen = ({
    showSearch = true,
}: {
    showSearch?: boolean;
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId } = useUserContext();

    const [searchQuery, setSearchQuery] = useState("");

    const { data: munches = [], isLoading } = useFetchMunches();

    const filteredMunches = useMemo(() => {
        const sortedActive = munches
            .sort((a, b) => {
                const aVerified = Boolean(a.verified);
                const bVerified = Boolean(b.verified);
                if (aVerified && !bVerified) return -1;
                if (!aVerified && bVerified) return 1;

                const aHasSchedule = Boolean(a.schedule_text);
                const bHasSchedule = Boolean(b.schedule_text);
                if (aHasSchedule && !bHasSchedule) return -1;
                if (!aHasSchedule && bHasSchedule) return 1;
                return a.title.localeCompare(b.title);
            });

        if (!searchQuery.trim()) {
            return sortedActive;
        }

        const lowerQuery = searchQuery.toLowerCase().trim();
        return sortedActive.filter((m) =>
            [
                m.title,
                m.location,
                m.main_audience,
                m.schedule_text,
                m.notes,
                m.hosts,
                m.cost_of_entry,
                m.cadence,
            ].some((field) => field?.toLowerCase().includes(lowerQuery))
        );
    }, [munches, searchQuery]);

    if (isLoading) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.loadingText}>Loading munches…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {showSearch && (
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search munches..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            )}

            {filteredMunches.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyMessage}>
                        No munches found{searchQuery ? " matching your search." : "."}
                    </Text>
                </View>
            )}

            {filteredMunches.length > 0 && (
                <FlatList
                    data={filteredMunches}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.8}
                            onPress={() => {
                                navigation.navigate("Munch Details", {
                                    munchId: item.id.toString(),
                                });
                                logEvent("munches_list_navigate_to_munch_detail", {
                                    munchId: item.id,
                                });
                            }}
                        >
                            <View style={styles.row}>
                                <FAIcon
                                    name="cutlery"
                                    size={28}
                                    color="#666"
                                    style={styles.icon}
                                />
                                <View style={styles.content}>
                                    {/* Title */}
                                    <Text style={styles.title} numberOfLines={1}>
                                        {item.title}
                                    </Text>

                                    {/* Badges: Verified, Location & Audience */}
                                    <View style={styles.badgesRow}>
                                        {item.verified && (
                                            <View style={[styles.badge, styles.verifiedBadge]}>
                                                <FAIcon
                                                    name="check-circle"
                                                    size={14}
                                                    color="#FFF"
                                                />
                                                <Text
                                                    style={styles.badgeText}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    Verified
                                                </Text>
                                            </View>
                                        )}
                                        {item.location && (
                                            <View style={[styles.badge, styles.locationBadge]}>
                                                <FAIcon
                                                    name="map-marker"
                                                    size={14}
                                                    color="#FFF"
                                                />
                                                <Text
                                                    style={styles.badgeText}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {item.location}
                                                </Text>
                                            </View>
                                        )}
                                        {item.main_audience && (
                                            <View style={[styles.badge, styles.audienceBadge]}>
                                                <FAIcon name="users" size={14} color="#FFF" />
                                                <Text
                                                    style={styles.badgeText}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {item.main_audience}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Schedule */}
                                    {item.schedule_text && (
                                        <Text style={styles.schedule} numberOfLines={1}>
                                            {item.schedule_text}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listFooter}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: "#fff",
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    icon: {
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
    },
    badgesRow: {
        flexDirection: "row",
        marginTop: 4,
        marginBottom: 6,
        flexWrap: "wrap",
        alignItems: "center",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: SCREEN_WIDTH * 0.45,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: "#1976D2", // default badge color
    },
    verifiedBadge: {
        backgroundColor: "#1976D2", // deep blue
    },
    locationBadge: {
        backgroundColor: "#00796B", // teal
    },
    audienceBadge: {
        backgroundColor: "#F57C00", // orange
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFF",
        marginLeft: 4,
    },
    schedule: {
        fontSize: 14,
        color: "#666",
    },
    centeredContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontSize: 16,
        color: "#666",
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
    },
    listFooter: {
        paddingBottom: 20,
    },
});
