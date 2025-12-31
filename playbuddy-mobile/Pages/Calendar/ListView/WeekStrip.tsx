// screens/Calendar/WeekStrip.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import moment from "moment-timezone";
import { HORIZONTAL_PADDING } from "../../../components/styles";
import { TZ } from "./calendarNavUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIGGER_PX = 40; // how far past center to count as a page change

type Props = {
    prevWeekDays: Date[];
    weekDays: Date[];   // center (visible) week
    nextWeekDays: Date[];

    selectedDay: Date;
    onChangeSelectedDay: (d: Date) => void;

    // Should be false for all days before today (you pass hasEventsOnOrAfterTodayNY)
    hasEventsOnDay: (d: Date | string) => boolean;

    // Header parity: RIGHT swipe → next week (forward), LEFT swipe → prev week (back)
    goToPrev: () => void;
    goToNext: () => void;

    // If false, prevent going to previous week (used for greying past)
    canGoPrev?: boolean;

    // Constrain width to container size (for docked layout)
    containerWidth?: number;
};

export const WeekStrip: React.FC<Props> = ({
    prevWeekDays,
    weekDays,
    nextWeekDays,
    selectedDay,
    onChangeSelectedDay,
    hasEventsOnDay,
    goToPrev,
    goToNext,
    canGoPrev = true,
    containerWidth,
}) => {
    const pageWidth = containerWidth || SCREEN_WIDTH;
    const scrollRef = useRef<ScrollView>(null);
    const offsetX = useRef(new Animated.Value(pageWidth)).current; // center page

    const scrollToCenter = (animated: boolean) => {
        scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated });
    };

    // Keep the scroller centered whenever the week arrays change
    useEffect(() => {
        // wait a frame so ScrollView has its content
        const id = requestAnimationFrame(() => scrollToCenter(false));
        return () => cancelAnimationFrame(id);
    }, [prevWeekDays, weekDays, nextWeekDays]);

    const isSameDayNY = (a: Date, b: Date) =>
        moment(a).tz(TZ).isSame(moment(b).tz(TZ), "day");

    const isTodayNY = (d: Date) =>
        moment(d).tz(TZ).isSame(moment().tz(TZ), "day");

    const renderWeek = (days: Date[], isCenter: boolean) => (
        <View style={[s.weekStrip, { width: pageWidth }]}>
            {days.map((day) => {
                const key = String(day instanceof Date ? day.getTime() : +new Date(day));
                const selectable = hasEventsOnDay(day);
                const selected = isCenter && isSameDayNY(day, selectedDay);
                const today = isTodayNY(day);

                return (
                    <TouchableOpacity
                        key={key}
                        disabled={!selectable}
                        onPress={() => selectable && onChangeSelectedDay(day)}
                        activeOpacity={0.85}
                        style={[
                            s.dayCell,
                            selectable ? s.dayHasEvent : s.dayNoEvent,
                            selected && s.daySelected,
                            today && s.todayRing,
                        ]}
                        accessibilityState={{ disabled: !selectable, selected }}
                        accessibilityLabel={`${moment(day).tz(TZ).format("dddd, MMM D")}${selectable ? "" : " (unavailable)"}`}
                    >
                        <Text style={[s.dowText, selectable ? s.textOn : s.textOff, selected && s.textSelected]}>
                            {moment(day).tz(TZ).format("ddd")}
                        </Text>
                        <Text style={[s.dayNum, selectable ? s.textOn : s.textOff, selected && s.textSelected]}>
                            {moment(day).tz(TZ).format("D")}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        // pages: 0 = prev, pageWidth = center, 2*pageWidth = next
        if (x > pageWidth + TRIGGER_PX) {
            // went to NEXT (forward in time)
            scrollToCenter(false);
            goToNext();
        } else if (x < pageWidth - TRIGGER_PX) {
            // went to PREV (back in time)
            scrollToCenter(false);
            if (canGoPrev) {
                goToPrev();
            } else {
                // not allowed to go prev → snap back
                scrollToCenter(true);
            }
        } else {
            // not far enough → snap back to center
            scrollToCenter(true);
        }
    };

    return (
        <Animated.View style={{ width: pageWidth, backgroundColor: "transparent" }}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ width: pageWidth * 3 }}
                contentOffset={{ x: pageWidth, y: 0 }} // start centered
                onMomentumScrollEnd={onMomentumEnd}
                // keep taps working smoothly on emulators
                scrollEventThrottle={16}
                alwaysBounceHorizontal
            >
                {renderWeek(prevWeekDays, false)}
                {renderWeek(weekDays, true)}
                {renderWeek(nextWeekDays, false)}
            </ScrollView>
        </Animated.View>
    );
};

const s = StyleSheet.create({
    weekStrip: {
        width: SCREEN_WIDTH,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: HORIZONTAL_PADDING,
        backgroundColor: "transparent",
    },
    dayCell: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 14,
        minWidth: 44,
        gap: 2,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
        backgroundColor: "rgba(255,255,255,0.16)",
    },
    dayHasEvent: {
        backgroundColor: "rgba(255,255,255,0.28)",
        borderColor: "rgba(255,255,255,0.45)",
    },
    dayNoEvent: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderColor: "rgba(255,255,255,0.22)",
    },
    daySelected: {
        backgroundColor: "#FFFFFF",
        borderColor: "#E3D9FF",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    todayRing: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.85)" },
    dowText: { fontSize: 12 },
    dayNum: { fontSize: 16, fontWeight: "600" },
    textOn: { color: "#3E2E72" },
    textOff: { color: "#9B90B9" },
    textSelected: { color: "#5A43B5" },
});

export default WeekStrip;
