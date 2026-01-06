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
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NavStack } from "../../Common/Nav/NavStackType";
import { type Munch } from "../../commonTypes";
import { UE } from "../../userEventTypes";
import { logEvent } from "../../Common/hooks/logger";
import { useFetchMunches } from "../../Common/db-axios/useMunches";
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import { MunchDetailsEventsTab } from "./MunchDetailsEventsTab";
import { MunchDetailsMainTab } from "./MunchDetailsMainTab";
import { useAnalyticsProps } from "../../Common/hooks/useAnalytics";
import TabBar from "../../components/TabBar";
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from "../../components/styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type MunchDetailsRouteProp = RouteProp<
    { MunchDetails: { munchId: string } },
    "MunchDetails"
>;

type TabKey = 'details' | 'events';

const tabs = [
    { name: 'Details', value: 'details' },
    { name: 'Events', value: 'events' },
];

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
                <ActivityIndicator size="large" color={colors.textMuted} />
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
            <TabBar tabs={tabs} active={activeTab} onPress={(value) => {
                setActiveTab(value as TabKey);
                logEvent(UE.MunchDetailsTabSelected, {
                    ...analyticsProps,
                    tab: value
                });
            }} />

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
    content: { paddingBottom: spacing.jumbo },
    centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'transparent' },
    errorText: { fontSize: fontSizes.xl, color: colors.badgeAlert, textAlign: "center", fontFamily: fontFamilies.body },
    headerCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
            },
            android: { elevation: 3 },
        }),
    },
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    icon: { marginRight: spacing.md },
    headerTitle: { fontSize: fontSizes.title, fontWeight: "700", color: colors.textPrimary, flexShrink: 1, fontFamily: fontFamilies.display },
    badgesRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md, alignItems: "center" },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: SCREEN_WIDTH * 0.45,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
    tagBadge: { backgroundColor: colors.badgeSlate },
    verifiedBadge: { backgroundColor: colors.brandBlue },
    locationBadge: { backgroundColor: colors.badgeLocation },
    audienceBadge: { backgroundColor: colors.badgeAudience },
    badgeText: { marginLeft: spacing.xs, fontSize: fontSizes.sm, fontWeight: "600", color: colors.white, fontFamily: fontFamilies.body },
    scheduleText: { fontSize: fontSizes.xl, color: colors.textBrown, marginTop: spacing.sm, fontFamily: fontFamilies.body },
    descriptionCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
            },
            android: { elevation: 2 },
        }),
    },
    sectionHeader: { fontSize: fontSizes.xxl, fontWeight: "600", color: colors.textPrimary, marginBottom: spacing.sm, fontFamily: fontFamilies.display },
    descriptionText: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.xl, fontFamily: fontFamilies.body },
    instructionsCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
            },
            android: { elevation: 2 },
        }),
    },
    numberedContainer: { marginTop: spacing.sm, marginLeft: spacing.xs },
    numberedLine: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.xl, marginBottom: spacing.xsPlus, fontFamily: fontFamilies.body },
    boldText: { fontWeight: "600" },
    horizontalRule: { height: 1, backgroundColor: colors.borderMutedAlt, marginVertical: spacing.md },
    fieldRow: { marginBottom: spacing.md },
    fieldLabel: { fontSize: fontSizes.base, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs, fontFamily: fontFamilies.body },
    fieldValue: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.lg, fontFamily: fontFamilies.body },
    detailCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
            },
            android: { elevation: 2 },
        }),
    },
    thanksCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
            },
            android: { elevation: 2 },
        }),
    },
    thanksText: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.lg, marginBottom: spacing.sm, fontFamily: fontFamilies.body },
    thanksMessage: { fontSize: fontSizes.xl, color: colors.textPrimary, lineHeight: lineHeights.lg, fontFamily: fontFamilies.body },
});
