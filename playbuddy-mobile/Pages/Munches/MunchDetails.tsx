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
    Dimensions,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import FAIcon from "react-native-vector-icons/FontAwesome";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { LAVENDER_BACKGROUND } from "../../styles";
import type { Munch } from "../../commonTypes";
import { logEvent } from "../../Common/hooks/logger";
import { useFetchMunches } from "../../Common/db-axios/useMunches";
import { LinkifyText } from "./LinkifyText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
            <View style={styles.detailFieldRow} key={label}>
                <Text style={styles.detailFieldLabel}>{label}</Text>
                <LinkifyText
                    style={styles.detailFieldValue}
                    platform={
                        label === "Hosts' Fetlife"
                            ? "fetlife"
                            : label === "Instagram"
                                ? "instagram"
                                : undefined
                    }
                >
                    {value}
                </LinkifyText>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header Card */}
            <View style={styles.headerCard}>
                <View style={styles.titleRow}>
                    <FAIcon name="cutlery" size={28} color="#666" style={styles.icon} />
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
                        {munch.schedule_text ?? ""}
                        {munch.schedule_text && munch.cadence ? " • " : ""}
                        {munch.cadence ?? ""}
                    </Text>
                )}
            </View>

            {/* Description Block (Notes) */}
            {munch.notes ? (
                <View style={styles.descriptionCard}>
                    <Text style={styles.sectionHeader}>Description</Text>
                    <LinkifyText platform="fetlife" style={styles.descriptionText}>
                        {munch.notes}
                    </LinkifyText>
                </View>
            ) : null}

            {/* How to Go to This Munch Section */}
            <View style={styles.instructionsCard}>
                <Text style={styles.sectionHeader}>How to Go to This Munch</Text>

                <View style={styles.numberedContainer}>
                    <Text style={styles.numberedLine}>
                        1. <Text style={styles.boldText}>Tap a host’s Fetlife profile</Text>.
                    </Text>
                    <Text style={styles.numberedLine}>
                        2. Scroll all the way to the bottom until you see the{" "}
                        <Text style={styles.boldText}>"Events Organizing"</Text> section.
                    </Text>
                    <Text style={styles.numberedLine}>
                        3. <Text style={styles.boldText}>View any upcoming munches there</Text>.
                        If none are listed, there are no upcoming events.
                    </Text>
                    <Text style={styles.numberedLine}>
                        4. You can also <Text style={styles.boldText}>visit their Instagram</Text>{" "}
                        or <Text style={styles.boldText}>send them a message</Text>.
                    </Text>
                </View>

                <View style={styles.horizontalRule} />

                {/* Hosts' Fetlife */}
                {munch.hosts ? (
                    <View style={styles.fieldRow} key="Hosts' Fetlife">
                        <Text style={styles.fieldLabel}>Hosts' Fetlife</Text>
                        <LinkifyText platform="fetlife" style={styles.fieldValue}>
                            {formatHosts(munch.hosts)}
                        </LinkifyText>
                    </View>
                ) : null}

                {/* Instagram */}
                {munch.ig_handle ? (
                    <View style={styles.fieldRow} key="Instagram">
                        <Text style={styles.fieldLabel}>Instagram</Text>
                        <LinkifyText platform="instagram" style={styles.fieldValue}>
                            {munch.ig_handle}
                        </LinkifyText>
                    </View>
                ) : null}
            </View>

            {/* Detail Card: other fields */}
            <View style={styles.detailCard}>
                {renderField("Cost of Entry", munch.cost_of_entry)}
                {renderField("Age Restriction", munch.age_restriction)}
                {renderField("Open to Everyone?", munch.open_to_everyone)}
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
        paddingBottom: 40, // Add extra bottom padding for safe area
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

    // Header Card
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
        maxWidth: SCREEN_WIDTH * 0.45,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "flex-start",
        marginRight: 8,
        marginBottom: 8,
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
        color: "#000",
    },
    scheduleText: {
        fontSize: 16,
        color: "#4E342E",
        marginTop: 8,
    },

    // Description Card
    descriptionCard: {
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
    sectionHeader: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 16,
        color: "#333",
        lineHeight: 24,
    },

    // Instructions Card
    instructionsCard: {
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
    numberedContainer: {
        marginTop: 8,
        marginLeft: 4,
    },
    numberedLine: {
        fontSize: 16,
        color: "#333",
        lineHeight: 24,
        marginBottom: 6,
    },
    boldText: {
        fontWeight: "600",
    },
    horizontalRule: {
        height: 1,
        backgroundColor: "#E0E0E0",
        marginVertical: 12,
    },
    fieldRow: {
        marginBottom: 12,
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

    // Detail Card: other fields
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
    detailFieldRow: {
        marginBottom: 16,
    },
    detailFieldLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#555",
        marginBottom: 4,
    },
    detailFieldValue: {
        fontSize: 16,
        color: "#333",
        lineHeight: 22,
    },
    linkText: {
        color: "#007AFF",
    },
});
