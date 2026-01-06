// screens/Calendar/WeekStrip.tsx
import React, { useMemo, useRef } from "react";
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Dimensions,
    PanResponder,
} from "react-native";
import moment from "moment-timezone";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../../components/styles";
import { TZ } from "./calendarNavUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_TRIGGER_PX = 28;

type Props = {
    weekDays: Date[];   // visible week

    selectedDay: Date;
    onChangeSelectedDay: (d: Date) => void;

    // Should be false for any day you want disabled (e.g., before today)
    isDaySelectable: (d: Date | string) => boolean;

    onSwipePrevDay?: () => void;
    onSwipeNextDay?: () => void;
    onLongPress?: (day: Date) => void;

    containerWidth?: number;
};

export const WeekStrip: React.FC<Props> = ({
    weekDays,
    selectedDay,
    onChangeSelectedDay,
    isDaySelectable,
    onSwipePrevDay,
    onSwipeNextDay,
    onLongPress,
    containerWidth,
}) => {
    const pageWidth = containerWidth || SCREEN_WIDTH;
    const longPressTriggeredRef = useRef(false);

    const isSameDayNY = (a: Date, b: Date) =>
        moment(a).tz(TZ).isSame(moment(b).tz(TZ), "day");

    const isTodayNY = (d: Date) =>
        moment(d).tz(TZ).isSame(moment().tz(TZ), "day");

    const panResponder = useMemo(() => {
        if (!onSwipePrevDay && !onSwipeNextDay) return null;
        return PanResponder.create({
            onMoveShouldSetPanResponder: (_evt, gesture) => {
                const { dx, dy } = gesture;
                if (Math.abs(dx) < 12) return false;
                return Math.abs(dx) > Math.abs(dy);
            },
            onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
                const { dx, dy } = gesture;
                if (Math.abs(dx) < 12) return false;
                return Math.abs(dx) > Math.abs(dy);
            },
            onPanResponderRelease: (_evt, gesture) => {
                if (gesture.dx <= -SWIPE_TRIGGER_PX) {
                    onSwipeNextDay?.();
                } else if (gesture.dx >= SWIPE_TRIGGER_PX) {
                    onSwipePrevDay?.();
                }
            },
        });
    }, [onSwipeNextDay, onSwipePrevDay]);

    const renderWeek = (days: Date[]) => (
        <View style={[s.weekStrip, { width: pageWidth }]}>
            {days.map((day) => {
                const dayMoment = moment(day).tz(TZ);
                const key = String(day instanceof Date ? day.getTime() : +new Date(day));
                const selectable = isDaySelectable(day);
                const selected = isSameDayNY(day, selectedDay);
                const today = isTodayNY(day);
                const showTodayRing = today && !selected;

                return (
                    <TouchableOpacity
                        key={key}
                        disabled={!selectable && !onLongPress}
                        onPress={() => {
                            if (longPressTriggeredRef.current) {
                                longPressTriggeredRef.current = false;
                                return;
                            }
                            if (!selectable) return;
                            onChangeSelectedDay(day);
                        }}
                        onLongPress={() => {
                            if (!onLongPress) return;
                            longPressTriggeredRef.current = true;
                            onLongPress(day);
                        }}
                        delayLongPress={280}
                        activeOpacity={0.85}
                        style={[
                            s.dayCell,
                            selectable ? s.dayHasEvent : s.dayNoEvent,
                            selected && s.daySelected,
                            showTodayRing && s.todayRing,
                        ]}
                        accessibilityState={{ disabled: !selectable, selected }}
                        accessibilityLabel={`${dayMoment.format("dddd, MMM D")}${selectable ? "" : " (unavailable)"}`}
                    >
                        <Text
                            style={[
                                s.dowText,
                                selectable ? s.textOn : s.textOff,
                                selected && s.textSelected,
                            ]}
                        >
                            {dayMoment.format("dd").toUpperCase()}
                        </Text>
                        <Text
                            style={[
                                s.dayNum,
                                selectable ? s.textOn : s.textOff,
                                selected && s.textSelected,
                            ]}
                        >
                            {dayMoment.format("D")}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <View
            style={{ width: pageWidth, backgroundColor: "transparent" }}
            {...(panResponder ? panResponder.panHandlers : {})}
        >
            {renderWeek(weekDays)}
        </View>
    );
};

const s = StyleSheet.create({
    weekStrip: {
        width: SCREEN_WIDTH,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacing.smPlus,
        paddingBottom: 0,
        paddingHorizontal: spacing.lg,
        backgroundColor: "transparent",
    },
    dayCell: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.xsPlus,
        borderRadius: radius.mdPlus,
        minWidth: 44,
        gap: spacing.xxs,
        backgroundColor: "transparent",
    },
    dayHasEvent: {
        backgroundColor: "transparent",
    },
    dayNoEvent: {
        backgroundColor: "transparent",
    },
    daySelected: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    todayRing: { borderWidth: 1, borderColor: colors.borderOnDarkBright },
    dowText: { fontSize: fontSizes.xs, letterSpacing: 0.6, fontFamily: fontFamilies.body },
    dayNum: { fontSize: fontSizes.lg, fontWeight: "600", fontFamily: fontFamilies.body },
    textOn: { color: colors.textOnDarkStrong },
    textOff: { color: colors.textOnDarkSubtle },
    textSelected: { color: colors.brandPurpleDark },
});

export default WeekStrip;
