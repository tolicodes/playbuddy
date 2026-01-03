// screens/Calendar/DateStripHeader.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import moment from "moment-timezone";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../../components/styles";

const TZ = "America/New_York";

type Props = {
    currentDate: Date;                 // Pass the weekAnchorDate (Sunday NY)
    goToPrev: () => void;
    goToNext: () => void;
    goToToday: () => void;
    disabledPrev?: boolean;            // Gray & disable the left chevron
    showWeekRange?: boolean;           // If true, show "Aug 24 – 30, 2025"
    isExpanded?: boolean;              // Month view vs week view
    onToggleExpand?: () => void;       // Toggle between week/month
};

export const DateStripHeader: React.FC<Props> = ({
    currentDate,
    goToPrev,
    goToNext,
    goToToday,
    disabledPrev = false,
    showWeekRange = false,
    isExpanded = false,
    onToggleExpand,
}) => {
    const m = moment(currentDate).tz(TZ);

    // Ensure Sunday-start range (NY time)
    const weekStart = m.clone().startOf("week");
    const weekEnd = weekStart.clone().add(6, "days");

    const monthLabel = m.format("MMMM YYYY");

    const weekRangeLabel = (() => {
        const sameMonth = weekStart.month() === weekEnd.month() && weekStart.year() === weekEnd.year();
        const sameYear = weekStart.year() === weekEnd.year();

        if (sameMonth) {
            // Aug 24 – 30, 2025
            return `${weekStart.format("MMM D")} – ${weekEnd.format("D, YYYY")}`;
        } else if (sameYear) {
            // Aug 31 – Sep 6, 2025
            return `${weekStart.format("MMM D")} – ${weekEnd.format("MMM D, YYYY")}`;
        }
        // Dec 29, 2024 – Jan 4, 2025
        return `${weekStart.format("MMM D, YYYY")} – ${weekEnd.format("MMM D, YYYY")}`;
    })();

    const label = showWeekRange ? weekRangeLabel : monthLabel;

    return (
        <View style={styles.headerWrap}>
            <View style={styles.leftGroup}>
                {/* Date range + pager */}
                <View style={styles.centerGroup}>
                    <TouchableOpacity
                        onPress={disabledPrev ? undefined : goToPrev}
                        disabled={disabledPrev}
                        style={[styles.arrowBtn, disabledPrev && styles.arrowDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Previous week"
                    accessibilityState={{ disabled: disabledPrev }}
                    testID="dateStrip-prev"
                >
                    <FAIcon name="chevron-left" size={18} color={colors.white} />
                </TouchableOpacity>

                <Text style={styles.centerText} numberOfLines={1} ellipsizeMode="tail">
                    {label}
                </Text>

                <TouchableOpacity
                    onPress={goToNext}
                    style={styles.arrowBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Next week"
                    testID="dateStrip-next"
                >
                    <FAIcon name="chevron-right" size={18} color={colors.white} />
                </TouchableOpacity>
                </View>
            </View>

            <View style={styles.rightGroup}>
                <TouchableOpacity
                    onPress={goToToday}
                    style={styles.todayPill}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityLabel="Jump to today"
                    testID="dateStrip-today"
                >
                    <FAIcon name="calendar-day" size={14} color={colors.white} />
                    <Text style={styles.todayText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => onToggleExpand?.()}
                    accessibilityLabel={isExpanded ? "Collapse calendar" : "Expand calendar"}
                >
                    <FAIcon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={colors.white}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerWrap: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xsPlus,
    },
    leftGroup: {
        flex: 1,
        marginRight: spacing.smPlus,
    },
    centerGroup: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
        paddingHorizontal: spacing.smPlus,
        height: 36,
    },
    expandButton: {
        width: spacing.xxxl,
        height: spacing.xxxl,
        borderRadius: radius.lg,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.35)",
    },
    centerText: {
        fontSize: fontSizes.xl,
        fontWeight: "700",
        color: colors.white,
        flexShrink: 1,
        textAlign: "center",
        fontFamily: fontFamilies.body,
    },
    arrowBtn: { padding: spacing.xs, opacity: 1 },
    arrowDisabled: { opacity: 0.35 },
    rightGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    todayPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xsPlus,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xsPlus,
        borderRadius: radius.pill,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.35)",
    },
    todayText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: "600",
        letterSpacing: 0.3,
        fontFamily: fontFamilies.body,
    },
});

export default DateStripHeader;
