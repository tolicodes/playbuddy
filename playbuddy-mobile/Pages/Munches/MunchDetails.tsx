// Final merged file — MunchDetails screen

import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { LAVENDER_BACKGROUND } from "../../components/styles";
import { type Munch } from "../../commonTypes";
import { UE } from "../../userEventTypes";
import { logEvent } from "../../Common/hooks/logger";
import { useFetchMunches } from "../../Common/db-axios/useMunches";
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import { MunchDetailsEventsTab } from "./MunchDetailsEventsTab";
import { MunchDetailsMainTab } from "./MunchDetailsMainTab";
import { useAnalyticsProps } from "../../Common/hooks/useAnalytics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type MunchDetailsRouteProp = RouteProp<
    { MunchDetails: { munchId: string } },
    "MunchDetails"
>;

export const MunchDetails = () => {
    const route = useRoute<MunchDetailsRouteProp>();
    const navigation = useNavigation<NavStack>();
    const { munchId } = route.params;
    const analyticsProps = useAnalyticsProps();

    const { data: munches = [], isLoading } = useFetchMunches();
    const { data: events = [] } = useFetchEvents({ includeFacilitatorOnly: true });

    const munchEvents = useMemo(() => {
        return events.filter(e => e.munch_id === parseInt(munchId, 10));
    }, [events, munchId]);

    const [munch, setMunch] = useState<Munch | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'events'>('details');

    useEffect(() => {
        navigation.setOptions({ title: "Munch Details" });
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


    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.tabContainer}>
                <View style={styles.tabRow}>
                    {(['details', 'events'] as const).map(key => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.tabButton, activeTab === key && styles.activeTab]}
                            onPress={() => {
                                setActiveTab(key);
                                logEvent(UE.MunchDetailsTabSelected, { ...analyticsProps, tab: key });
                            }}
                        >
                            <Text style={activeTab === key ? styles.activeTabText : styles.tabText}>
                                {key === 'details' ? 'Munch Details' : 'Munch Events'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>



            {activeTab === 'details' ? (
                <MunchDetailsMainTab munch={munch} />
            ) : (
                <MunchDetailsEventsTab munch={munch} events={munchEvents} />
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { paddingBottom: 40 },
    centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'transparent' },
    errorText: { fontSize: 16, color: "#E74C3C", textAlign: "center" },
    headerCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }, android: { elevation: 3 } }) },
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    icon: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontWeight: "700", color: "#333", flexShrink: 1 },
    badgesRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12, alignItems: "center" },
    badge: { flexDirection: "row", alignItems: "center", maxWidth: SCREEN_WIDTH * 0.45, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 8, marginBottom: 8 },
    tagBadge: { backgroundColor: "#455A64" },
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
    thanksMessage: { fontSize: 16, color: "#333", lineHeight: 22 },
    tabContainer: { backgroundColor: '#fff', marginBottom: 10, borderRadius: 12 },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 5, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginBottom: 10 },
    tabButton: { paddingVertical: 8 },
    tabText: { color: '#888' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#7F5AF0' },
    activeTabText: { color: '#7F5AF0', fontWeight: '600' },
});
