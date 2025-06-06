// MunchesScreen.tsx

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
import type { Munch } from "../../commonTypes";

export const MunchesScreen = ({
    showSearch = true,
}: {
    showSearch?: boolean;
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId } = useUserContext();

    const [searchQuery, setSearchQuery] = useState("");

    // Fetch munches
    const { data: munches = [], isLoading } = useFetchMunches();

    // Filter, sort, and search logic
    const filteredMunches = useMemo(() => {
        const sortedActive = munches
            .filter((m) => m.status === "Active")
            .sort((a, b) => {
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
                m.ig_handle,
                m.cost_of_entry,
                m.cadence,
            ].some((field) => field?.toLowerCase().includes(lowerQuery))
        );
    }, [munches, searchQuery]);

    // Loading and empty states
    if (isLoading) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.loadingText}>Loading munches…</Text>
            </View>
        );
    }
    if (filteredMunches.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyMessage}>
                    No munches found{searchQuery ? " matching your search." : "."}
                </Text>
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

                                {/* Badges: Borough & Audience */}
                                <View style={styles.badgesRow}>
                                    {item.location ? (
                                        <View style={[styles.badge, styles.locationBadge]}>
                                            <Text
                                                style={styles.badgeText}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {item.location}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {item.main_audience ? (
                                        <View style={[styles.badge, styles.audienceBadge]}>
                                            <Text
                                                style={styles.badgeText}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {item.main_audience}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Schedule */}
                                {item.schedule_text ? (
                                    <Text style={styles.schedule} numberOfLines={1}>
                                        {item.schedule_text}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listFooter}
                showsVerticalScrollIndicator={false}
            />
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
        marginTop: 6,
        marginBottom: 6,
        flexWrap: "wrap",
        alignItems: "flex-start",
    },
    badge: {
        maxWidth: SCREEN_WIDTH * 0.4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "flex-start",
        marginRight: 6,
        marginBottom: 6,
    },
    locationBadge: {
        backgroundColor: "#26C6DA", // vibrant teal
    },
    audienceBadge: {
        backgroundColor: "#FFC107", // vibrant amber
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#000", // high contrast
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
