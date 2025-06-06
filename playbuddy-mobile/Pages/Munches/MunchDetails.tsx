import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Platform,
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

    const formatHosts = (hosts: string | null) => {
        if (!hosts) return null;
        const list = hosts
            .split(/\r?\n|,/)
            .map((h) => h.trim())
            .filter((h) => h.length > 0);
        return list.join(" • ");
    };

    const renderField = (label: string, value: string | null) => {
        if (!value) return null;
        return (
            <View style={styles.fieldRow} key={label}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.titleRow}>
                    <FAIcon name="cutlery" size={28} color="#666" style={styles.icon} />
                    <Text style={styles.headerTitle}>{munch.title}</Text>
                </View>

                <View style={styles.badgesRow}>
                    {munch.verified && (
                        <View style={[styles.badge, styles.verifiedBadge]}>
                            <FAIcon name="check-circle" size={14} color="#FFF" />
                            <Text style={styles.badgeText}>Verified</Text>
                        </View>
                    )}
                    {munch.location && (
                        <View style={[styles.badge, styles.locationBadge]}>
                            <FAIcon name="map-marker" size={14} color="#FFF" />
                            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
                                {munch.location}
                            </Text>
                        </View>
                    )}
                    {munch.main_audience && (
                        <View style={[styles.badge, styles.audienceBadge]}>
                            <FAIcon name="users" size={14} color="#FFF" />
                            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
                                {munch.main_audience}
                            </Text>
                        </View>
                    )}
                </View>

                {(munch.schedule_text || munch.cadence) && (
                    <Text style={styles.scheduleText}>
                        {munch.schedule_text ?? ""}
                        {munch.schedule_text && munch.cadence ? " • " : ""}
                        {munch.cadence ?? ""}
                    </Text>
                )}
            </View>

            {munch.notes && (
                <View style={styles.descriptionCard}>
                    <Text style={styles.sectionHeader}>Description</Text>
                    <LinkifyText platform="fetlife" style={styles.descriptionText}>
                        {munch.notes}
                    </LinkifyText>
                </View>
            )}

            <View style={styles.instructionsCard}>
                <Text style={styles.sectionHeader}>How to Go to This Munch</Text>
                <View style={styles.numberedContainer}>
                    <Text style={styles.numberedLine}>
                        1. <Text style={styles.boldText}>Tap a host’s Fetlife profile</Text>.
                    </Text>
                    <Text style={styles.numberedLine}>
                        2. Scroll to the bottom to find <Text style={styles.boldText}>"Events Organizing"</Text>.
                    </Text>
                    <Text style={styles.numberedLine}>
                        3. <Text style={styles.boldText}>View upcoming munches</Text>. If none, none scheduled.
                    </Text>
                    <Text style={styles.numberedLine}>
                        4. <Text style={styles.boldText}>Message a host</Text> for details.
                    </Text>
                </View>
                <View style={styles.horizontalRule} />

                {munch.hosts && (
                    <View style={styles.fieldRow} key="Hosts">
                        <Text style={styles.fieldLabel}>Hosts' Fetlife</Text>
                        <LinkifyText platform="fetlife" style={styles.fieldValue}>
                            {formatHosts(munch.hosts)}
                        </LinkifyText>
                    </View>
                )}
            </View>

            <View style={styles.detailCard}>
                {renderField("Cost of Entry", munch.cost_of_entry)}
                {renderField("Age Restriction", munch.age_restriction)}
                {renderField("Open to Everyone?", munch.open_to_everyone)}
                {renderField("Status", munch.status)}
            </View>

            <View style={styles.thanksCard}>
                <Text style={styles.sectionHeader}>Special Thanks</Text>
                <Text style={styles.thanksText}>
                    This list was compiled by a community member, <Text style={styles.boldText}>Rose</Text>.
                </Text>
                <Text style={styles.thanksMessage}>
                    <Text style={styles.boldText}>Message from Rose: </Text>
                    Hi, I’m Rose. I hope this is helpful in your kink/BDSM journey. Pace yourself — it pays off.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: LAVENDER_BACKGROUND },
    content: { padding: 16, paddingBottom: 40 },
    centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: LAVENDER_BACKGROUND },
    errorText: { fontSize: 16, color: "#E74C3C", textAlign: "center" },

    headerCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }, android: { elevation: 3 } }) },
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    icon: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontWeight: "700", color: "#333", flexShrink: 1 },
    badgesRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12, alignItems: "center" },
    badge: { flexDirection: "row", alignItems: "center", maxWidth: SCREEN_WIDTH * 0.45, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 8, marginBottom: 8 },
    verifiedBadge: { backgroundColor: "#1976D2" },
    locationBadge: { backgroundColor: "#00796B" },
    audienceBadge: { backgroundColor: "#F57C00" },
    badgeText: { marginLeft: 4, fontSize: 12, fontWeight: "600", color: "#FFF" },
    scheduleText: { fontSize: 16, color: "#4E342E", marginTop: 8 },

    descriptionCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 }, android: { elevation: 2 } }) },
    sectionHeader: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8 },
    descriptionText: { fontSize: 16, color: "#333", lineHeight: 24 },

    instructionsCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 }, android: { elevation: 2 } }) },
    numberedContainer: { marginTop: 8, marginLeft: 4 },
    numberedLine: { fontSize: 16, color: "#333", lineHeight: 24, marginBottom: 6 },
    boldText: { fontWeight: "600" },
    horizontalRule: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 12 },
    fieldRow: { marginBottom: 12 },
    fieldLabel: { fontSize: 14, fontWeight: "600", color: "#555", marginBottom: 4 },
    fieldValue: { fontSize: 16, color: "#333", lineHeight: 22 },

    detailCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 }, android: { elevation: 2 } }) },

    thanksCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 }, android: { elevation: 2 } }) },
    thanksText: { fontSize: 16, color: "#333", lineHeight: 22, marginBottom: 8 },
    thanksMessage: { fontSize: 16, color: "#333", lineHeight: 22 }
});
