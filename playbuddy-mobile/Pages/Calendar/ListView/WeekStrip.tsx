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
import { LAVENDER_BACKGROUND, ACCENT_PURPLE, HORIZONTAL_PADDING } from "../../../components/styles";
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
}) => {
    const scrollRef = useRef<ScrollView>(null);
    const offsetX = useRef(new Animated.Value(SCREEN_WIDTH)).current; // center page

    const scrollToCenter = (animated: boolean) => {
        scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, y: 0, animated });
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
        <View style={s.weekStrip}>
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
        // pages: 0 = prev, SCREEN_WIDTH = center, 2*SCREEN_WIDTH = next
        if (x > SCREEN_WIDTH + TRIGGER_PX) {
            // went to NEXT (forward in time)
            scrollToCenter(false);
            goToNext();
        } else if (x < SCREEN_WIDTH - TRIGGER_PX) {
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
        <Animated.View style={{ width: SCREEN_WIDTH, backgroundColor: "transparent" }}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ width: SCREEN_WIDTH * 3 }}
                contentOffset={{ x: SCREEN_WIDTH, y: 0 }} // start centered
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
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: HORIZONTAL_PADDING,
        backgroundColor: "transparent",
    },
    dayCell: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        minWidth: 44,
        gap: 2,
    },
    dayHasEvent: { backgroundColor: ACCENT_PURPLE },
    dayNoEvent: { backgroundColor: "#D9C8F6" },
    daySelected: { backgroundColor: LAVENDER_BACKGROUND },
    todayRing: { borderWidth: 1, borderColor: "rgba(255,255,255,0.65)" },
    dowText: { fontSize: 12 },
    dayNum: { fontSize: 16, fontWeight: "600" },
    textOn: { color: "white" },
    textOff: { color: "#6b6b6b" },
    textSelected: { color: "black" },
});

export default WeekStrip;
