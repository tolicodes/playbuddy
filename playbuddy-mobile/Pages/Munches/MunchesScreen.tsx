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
import { LAVENDER_BACKGROUND } from "../../components/styles";
import { logEvent } from "../../Common/hooks/logger";
import { useFetchMunches } from "../../Common/db-axios/useMunches";
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../../Common/hooks/useAnalytics";

const GettingConsent = () => (
    <View style={styles.centeredContainer}>
        <Text style={styles.consentHeader}>Getting consent…</Text>
        <Text>
            We take consent very seriously. Which is why we are contacting each organizer
            individually before listing them publicly. Check back soon to see our favorite munches trickle in!
        </Text>
    </View>
);

export const MunchesScreen = ({ showSearch = true }: { showSearch?: boolean }) => {
    const navigation = useNavigation<NavStack>();
    const [searchQuery, setSearchQuery] = useState("");
    const analyticsProps = useAnalyticsProps();

    const { data: munches = [], isLoading } = useFetchMunches();
    const { data: events = [] } = useFetchEvents({ includeFacilitatorOnly: true });

    const munchesWithEvents = useMemo(() => {
        return munches.map((m) => {
            const eventsForMunch = events.filter((e) => e.munch_id === m.id);
            return { ...m, events: eventsForMunch };
        });
    }, [munches, events]);

    const filteredMunches = useMemo(() => {
        const sortedVerified = munchesWithEvents
            .filter((m) => Boolean(m.verified))
            .sort((a, b) => {
                const aHasEvents = a.events.length > 0;
                const bHasEvents = b.events.length > 0;
                if (aHasEvents && !bHasEvents) return -1;
                if (!aHasEvents && bHasEvents) return 1;
                return a.title.localeCompare(b.title);
            });

        if (!searchQuery.trim()) return sortedVerified;

        const lowerQuery = searchQuery.toLowerCase().trim();
        return sortedVerified.filter((m) =>
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
    }, [munchesWithEvents, searchQuery]);

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
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                />
            )}

            <GettingConsent />

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
                                navigation.navigate("Munch Details", { munchId: item.id.toString() });
                                logEvent(UE.MunchesListNavigateToMunchDetail, { ...analyticsProps, munch_id: item.id });
                            }}
                        >
                            <View style={styles.row}>
                                <FAIcon name="cutlery" size={28} color="#666" style={styles.icon} />
                                <View style={styles.content}>
                                    <View style={styles.titleRow}>
                                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                                        {item.events.length > 0 && (
                                            <View style={styles.eventCountBadge}>
                                                <Text style={styles.eventCountText}>{item.events.length} Events</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.badgesRow}>
                                        {item.location && (
                                            <View style={[styles.badge, styles.locationBadge]}>
                                                <FAIcon name="map-marker" size={14} color="#FFF" />
                                                <Text style={styles.badgeText}>{item.location}</Text>
                                            </View>
                                        )}
                                        {item.main_audience && (
                                            <View style={[styles.badge, styles.audienceBadge]}>
                                                <FAIcon name="users" size={14} color="#FFF" />
                                                <Text style={styles.badgeText}>{item.main_audience}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {item.schedule_text && (
                                        <Text style={styles.schedule} numberOfLines={1}>{item.schedule_text}</Text>
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
    container: { flex: 1, backgroundColor: LAVENDER_BACKGROUND, paddingTop: 20 },
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
            android: { elevation: 3 },
        }),
    },
    row: { flexDirection: "row", alignItems: "center" },
    icon: { marginRight: 12 },
    content: { flex: 1 },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    title: { fontSize: 18, fontWeight: "600", color: "#333", flex: 1 },
    eventCountBadge: {
        backgroundColor: '#7F5AF0',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    eventCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
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
        maxWidth: 150,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: "#1976D2",
        overflow: 'hidden',
        maxHeight: 22,
    },
    verifiedBadge: { backgroundColor: "#1976D2" },
    locationBadge: { backgroundColor: "#00796B" },
    audienceBadge: { backgroundColor: "#F57C00" },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFF",
        marginLeft: 4,
    },
    schedule: { fontSize: 14, color: "#666" },
    centeredContainer: { justifyContent: "center", alignItems: "center", padding: 20 },
    loadingText: { fontSize: 16, color: "#666" },
    emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
    emptyMessage: { fontSize: 16, color: "#666", textAlign: "center" },
    listFooter: { paddingBottom: 20 },
    consentHeader: { fontSize: 24, fontWeight: "bold" },
    centeredText: { fontSize: 16, color: "#666", textAlign: "center" },
});
