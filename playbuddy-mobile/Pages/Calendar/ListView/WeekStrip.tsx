// screens/Calendar/WeekStrip.tsx
import React, { useEffect, useRef } from "react";
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import moment from "moment-timezone";
import { colors, fontFamilies, fontSizes, radius, spacing } from "../../../components/styles";
import { TZ } from "./calendarNavUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = {
    prevWeekDays: Date[];
    weekDays: Date[];   // visible week
    nextWeekDays: Date[];

    selectedDay: Date;
    onChangeSelectedDay: (d: Date) => void;

    // Should be false for any day you want disabled (e.g., before today)
    isDaySelectable: (d: Date | string) => boolean;
    hasEventsOnDay?: (d: Date | string) => boolean;

    onSwipePrevDay?: () => void;
    onSwipeNextDay?: () => void;
    onLongPress?: (day: Date) => void;

    containerWidth?: number;
};

export const WeekStrip: React.FC<Props> = ({
    prevWeekDays,
    weekDays,
    nextWeekDays,
    selectedDay,
    onChangeSelectedDay,
    isDaySelectable,
    hasEventsOnDay,
    onSwipePrevDay,
    onSwipeNextDay,
    onLongPress,
    containerWidth,
}) => {
    const pageWidth = containerWidth || SCREEN_WIDTH;
    const longPressTriggeredRef = useRef(false);
    const scrollRef = useRef<ScrollView>(null);
    const weekAnchor = weekDays[0]?.getTime() ?? 0;

    const isSameDayNY = (a: Date, b: Date) =>
        moment(a).tz(TZ).isSame(moment(b).tz(TZ), "day");

    const isTodayNY = (d: Date) =>
        moment(d).tz(TZ).isSame(moment().tz(TZ), "day");

    useEffect(() => {
        scrollRef.current?.scrollTo({ x: pageWidth, animated: false });
    }, [pageWidth, weekAnchor]);

    const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(offsetX / pageWidth);
        if (pageIndex === 0) {
            onSwipePrevDay?.();
        } else if (pageIndex === 2) {
            onSwipeNextDay?.();
        }
    };

    const renderWeek = (days: Date[]) => (
        <View style={[s.weekStrip, { width: pageWidth }]}>
            {days.map((day) => {
                const dayMoment = moment(day).tz(TZ);
                const key = String(day instanceof Date ? day.getTime() : +new Date(day));
                const selectable = isDaySelectable(day);
                const hasEvent = hasEventsOnDay ? hasEventsOnDay(day) : true;
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
                            hasEvent ? s.dayHasEvent : s.dayNoEvent,
                            selected && s.daySelected,
                            showTodayRing && s.todayRing,
                        ]}
                        accessibilityState={{ disabled: !selectable, selected }}
                        accessibilityLabel={`${dayMoment.format("dddd, MMM D")}${selectable ? "" : " (unavailable)"}`}
                    >
                        <Text
                            style={[
                                s.dowText,
                                !selectable ? s.textOff : hasEvent ? s.textOn : s.textNoEvent,
                                selected && s.textSelected,
                            ]}
                        >
                            {dayMoment.format("dd").toUpperCase()}
                        </Text>
                        <Text
                            style={[
                                s.dayNum,
                                !selectable ? s.textOff : hasEvent ? s.textOn : s.textNoEvent,
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
        <View style={{ width: pageWidth, backgroundColor: "transparent", alignSelf: "center" }}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumEnd}
                contentOffset={{ x: pageWidth, y: 0 }}
                contentContainerStyle={s.scrollContainer}
            >
                {renderWeek(prevWeekDays)}
                {renderWeek(weekDays)}
                {renderWeek(nextWeekDays)}
            </ScrollView>
        </View>
    );
};

const s = StyleSheet.create({
    scrollContainer: {
        alignItems: "center",
    },
    weekStrip: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        alignSelf: "center",
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxs,
        paddingHorizontal: spacing.xs,
        backgroundColor: colors.surfaceWhiteStrong,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    dayCell: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        marginHorizontal: spacing.xxs,
        borderRadius: radius.mdPlus,
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
        borderColor: colors.borderLavenderStrong,
        shadowColor: colors.black,
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    todayRing: { borderWidth: 1, borderColor: colors.brandPurpleDark },
    dowText: {
        fontSize: fontSizes.xs,
        letterSpacing: 0.8,
        fontWeight: "600",
        fontFamily: fontFamilies.body,
    },
    dayNum: { fontSize: fontSizes.lg, fontWeight: "600", fontFamily: fontFamilies.body },
    textOn: { color: colors.textPrimary },
    textOff: { color: colors.textSubtle },
    textNoEvent: { color: colors.textSlate },
    textSelected: { color: colors.brandPurpleDark },
});

export default WeekStrip;
