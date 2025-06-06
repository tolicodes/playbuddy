// MunchDetails.tsx

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
    Linking,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import FAIcon from "react-native-vector-icons/FontAwesome";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { LAVENDER_BACKGROUND } from "../../styles";
import type { Munch } from "../../commonTypes";
import { logEvent } from "../../Common/hooks/logger";
import { useFetchMunches } from "../../Common/db-axios/useMunches";
import { LinkifyText } from "./LinkifyText";

type MunchDetailsRouteProp = RouteProp<
    { MunchDetails: { munchId: string } },
    "MunchDetails"
>;

export const MunchDetails = () => {
    const route = useRoute<MunchDetailsRouteProp>();
    const navigation = useNavigation<NavStack>();
    const { munchId } = route.params;

    const { data: munches = [], isLoading } = useFetchMunches();
    const [munch, setMunch] = useState<Munch | null>(null);

    useEffect(() => {
        navigation.setOptions({ title: "Munch Details" });
        logEvent("munch_detail_screen_view", { munchId });
        const found = munches.find((m) => m.id === parseInt(munchId, 10));
        setMunch(found || null);
    }, [munchId, munches]);

    if (isLoading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#666" />
            </View>
        );
    }

    if (!munch) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.errorText}>Munch not found.</Text>
            </View>
        );
    }

    // Join hosts with bullet separators (•)
    const formatHosts = (hosts: string | null) => {
        if (!hosts) return null;
        // Split on newline or comma and trim whitespace
        const list = hosts
            .split(/\r?\n|,/)
            .map((h) => h.trim())
            .filter((h) => h.length > 0);
        return list.join(" • ");
    };

    // Helper to render a field label + value pair
    const renderField = (label: string, value: string | null) => {
        if (!value) return null;
        return (
            <View style={styles.fieldRow} key={label}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <LinkifyText style={styles.fieldValue}>{value}</LinkifyText>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header Card */}
            <View style={styles.headerCard}>
                <View style={styles.titleRow}>
                    <FAIcon name="cutlery" size={30} color="#666" style={styles.icon} />
                    <Text style={styles.headerTitle}>{munch.title}</Text>
                </View>

                {/* Badges Row: Borough & Audience */}
                <View style={styles.badgesRow}>
                    {munch.location ? (
                        <View style={[styles.badge, styles.locationBadge]}>
                            <Text
                                style={styles.badgeText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {munch.location}
                            </Text>
                        </View>
                    ) : null}
                    {munch.main_audience ? (
                        <View style={[styles.badge, styles.audienceBadge]}>
                            <Text
                                style={styles.badgeText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {munch.main_audience}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Schedule */}
                {(munch.schedule_text || munch.cadence) && (
                    <Text style={styles.scheduleText}>
                        {munch.schedule_text ? munch.schedule_text : ""}
                        {munch.schedule_text && munch.cadence ? " • " : ""}
                        {munch.cadence ? munch.cadence : ""}
                    </Text>
                )}
            </View>

            {/* Notes (outside card) */}
            {munch.notes ? (
                <View style={styles.notesContainerTop}>
                    <LinkifyText style={styles.notesValueTop}>{munch.notes}</LinkifyText>
                </View>
            ) : null}

            {/* Detail Card: other fields */}
            <View style={styles.detailCard}>
                {/* Hosts */}
                {munch.hosts ? (
                    <View style={styles.fieldRow} key="Hosts">
                        <Text style={styles.fieldLabel}>Hosts</Text>
                        <LinkifyText style={styles.hostsValue}>{formatHosts(munch.hosts)}</LinkifyText>
                    </View>
                ) : null}

                {/* Instagram */}
                {munch.ig_handle ? (
                    <View style={styles.fieldRow} key="Instagram">
                        <Text style={styles.fieldLabel}>Instagram</Text>
                        <TouchableOpacity
                            onPress={() => {
                                const igHandle = munch.ig_handle!.startsWith("@")
                                    ? munch.ig_handle!.slice(1)
                                    : munch.ig_handle!;
                                const igUrl = `https://instagram.com/${igHandle}`;
                                Linking.openURL(igUrl).catch(() =>
                                    console.warn("Failed to open URL:", igUrl)
                                );
                            }}
                        >
                            <Text style={[styles.fieldValue, styles.linkText]}>
                                {munch.ig_handle}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Cost of Entry */}
                {renderField("Cost of Entry", munch.cost_of_entry)}

                {/* Age Restriction */}
                {renderField("Age Restriction", munch.age_restriction)}

                {/* Open to Everyone */}
                {renderField("Open to Everyone?", munch.open_to_everyone)}

                {/* Status */}
                {renderField("Status", munch.status)}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LAVENDER_BACKGROUND,
    },
    content: {
        padding: 16,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        backgroundColor: LAVENDER_BACKGROUND,
    },
    errorText: {
        fontSize: 16,
        color: "#E74C3C",
        textAlign: "center",
    },
    headerCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
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
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    icon: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#333",
        flexShrink: 1,
    },
    badgesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 12,
    },
    badge: {
        width: 100,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
        marginBottom: 8,
        paddingHorizontal: 6,
    },
    locationBadge: {
        backgroundColor: "#E0F7FA",
    },
    audienceBadge: {
        backgroundColor: "#FFF3E0",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#00796B",
    },
    scheduleText: {
        fontSize: 16,
        color: "#4E342E",
    },
    notesContainerTop: {
        backgroundColor: "#F7F7F9",
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    notesValueTop: {
        fontSize: 16,
        color: "#333",
        lineHeight: 24,
    },
    detailCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    fieldRow: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#555",
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 16,
        color: "#333",
        lineHeight: 22,
    },
    hostsValue: {
        fontSize: 16,
        color: "#333",
        lineHeight: 22,
    },
    linkText: {
        color: "#007AFF",
    },
});
