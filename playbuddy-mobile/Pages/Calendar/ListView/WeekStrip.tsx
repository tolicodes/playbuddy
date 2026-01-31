// screens/Calendar/WeekStrip.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
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
import { useCalendarCoach } from "../../PopupManager";
import { CalendarCoachTooltip } from "./CalendarCoachTooltip";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CALENDAR_COACH_BORDER_COLOR = 'transparent';

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
    animateToCurrentWeek?: boolean;
    animateDirection?: "prev" | "next" | null;
    wiggleTodayToken?: number | null;
    showDateToast?: boolean;
    dateToastAnim?: Animated.Value;
    onDismissDateToast?: () => void;
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
    animateToCurrentWeek = false,
    animateDirection = null,
    wiggleTodayToken = null,
    showDateToast = false,
    dateToastAnim,
    onDismissDateToast,
}) => {
    const calendarCoach = useCalendarCoach();
    const showCoachOverlay = calendarCoach?.showOverlay ?? false;
    const pageWidth = containerWidth || SCREEN_WIDTH;
    const longPressTriggeredRef = useRef(false);
    const scrollRef = useRef<ScrollView>(null);
    const isUserScrollingRef = useRef(false);
    const weekAnchor = weekDays[0]?.getTime() ?? 0;
    const wiggleAnim = useRef(new Animated.Value(0)).current;
    const [weekStripHeight, setWeekStripHeight] = useState(0);

    const isSameDayNY = (a: Date, b: Date) =>
        moment(a).tz(TZ).isSame(moment(b).tz(TZ), "day");

    const isTodayNY = (d: Date) =>
        moment(d).tz(TZ).isSame(moment().tz(TZ), "day");

    useEffect(() => {
        const scrollView = scrollRef.current;
        if (!scrollView) return;
        if (animateToCurrentWeek && animateDirection) {
            const startX = animateDirection === "next" ? 0 : pageWidth * 2;
            scrollView.scrollTo({ x: startX, animated: false });
            requestAnimationFrame(() => {
                scrollView.scrollTo({ x: pageWidth, animated: true });
            });
            return;
        }
        scrollView.scrollTo({ x: pageWidth, animated: false });
    }, [pageWidth, weekAnchor, animateToCurrentWeek, animateDirection]);

    useEffect(() => {
        if (!showDateToast && !wiggleTodayToken) return;
        wiggleAnim.stopAnimation();
        wiggleAnim.setValue(0);

        const sequence = Animated.sequence([
            Animated.timing(wiggleAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.delay(900),
        ]);

        if (showDateToast) {
            const loop = Animated.loop(sequence);
            loop.start();
            return () => loop.stop();
        }

        sequence.start();
        return undefined;
    }, [showDateToast, wiggleAnim, wiggleTodayToken]);

    const wiggleRotation = wiggleAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-6deg', '6deg'],
    });
    const wiggleScale = wiggleAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [1.08, 1, 1.08],
    });

    const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!isUserScrollingRef.current) {
            return;
        }
        isUserScrollingRef.current = false;
        const offsetX = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(offsetX / pageWidth);
        if (pageIndex === 0) {
            onSwipePrevDay?.();
        } else if (pageIndex === 2) {
            onSwipeNextDay?.();
        }
    };

    const renderWeek = (days: Date[]) => (
        <View
            style={[
                s.weekStrip,
                { width: pageWidth },
                showCoachOverlay && s.weekStripCoach,
                showDateToast && s.weekStripToast,
            ]}
        >
            {days.map((day) => {
                const dayMoment = moment(day).tz(TZ);
                const key = String(day instanceof Date ? day.getTime() : +new Date(day));
                const selectable = isDaySelectable(day);
                const hasEvent = hasEventsOnDay ? hasEventsOnDay(day) : true;
                const selected = isSameDayNY(day, selectedDay);
                const today = isTodayNY(day);
                const showToastHighlight = showDateToast && selected;
                const showToastDim = showDateToast && !showToastHighlight && !today;
                const showTodayHighlight = today && !selected;
                const showTodaySelected = today && selected;
                const showTodayText = today;
                const showTodayRing = today && !selected;
                const wiggleStyle =
                    showToastHighlight ? { transform: [{ rotate: wiggleRotation }, { scale: wiggleScale }] } : null;

                return (
                    <AnimatedTouchableOpacity
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
                            showToastDim && s.toastDim,
                            showTodayHighlight && s.todayHighlight,
                            selected && s.daySelected,
                            showTodaySelected && s.todaySelected,
                            showTodayRing && s.todayRing,
                            showToastHighlight && s.toastHighlight,
                            showCoachOverlay && selected && s.daySelectedCoach,
                            showCoachOverlay && showTodayRing && s.todayRingCoach,
                            wiggleStyle,
                        ]}
                        accessibilityState={{ disabled: !selectable, selected }}
                        accessibilityLabel={`${dayMoment.format("dddd, MMM D")}${selectable ? "" : " (unavailable)"}`}
                    >
                        <Text
                            style={[
                                s.dowText,
                                !selectable ? s.textOff : hasEvent ? s.textOn : s.textNoEvent,
                                showTodayText && s.textToday,
                                selected && s.textSelected,
                                showToastHighlight && s.toastHighlightText,
                            ]}
                        >
                            {dayMoment.format("dd").toUpperCase()}
                        </Text>
                        <Text
                            style={[
                                s.dayNum,
                                !selectable ? s.textOff : hasEvent ? s.textOn : s.textNoEvent,
                                showTodayText && s.textToday,
                                selected && s.textSelected,
                                showToastHighlight && s.toastHighlightText,
                            ]}
                        >
                            {dayMoment.format("D")}
                        </Text>
                    </AnimatedTouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <View
            style={[s.wrapper, { width: pageWidth }]}
            onLayout={(event) => setWeekStripHeight(event.nativeEvent.layout.height)}
        >
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={() => {
                    isUserScrollingRef.current = true;
                }}
                onMomentumScrollEnd={handleMomentumEnd}
                contentOffset={{ x: pageWidth, y: 0 }}
                contentContainerStyle={s.scrollContainer}
            >
                {renderWeek(prevWeekDays)}
                {renderWeek(weekDays)}
                {renderWeek(nextWeekDays)}
            </ScrollView>
            {showDateToast && (
                <CalendarCoachTooltip
                    title="Calendar Tip"
                    iconName="calendar"
                    message="Long press the date for month view"
                    onClose={onDismissDateToast ?? (() => {})}
                    anim={dateToastAnim}
                    placement="below"
                    containerStyle={[
                        s.dateToastTooltip,
                        { top: Math.max(0, weekStripHeight + spacing.xs) },
                    ]}
                />
            )}
        </View>
    );
};

const s = StyleSheet.create({
    wrapper: {
        alignSelf: "center",
        backgroundColor: "transparent",
        position: "relative",
    },
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
        position: "relative",
    },
    weekStripCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    weekStripToast: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
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
        position: "relative",
        zIndex: 0,
    },
    dayHasEvent: {
        backgroundColor: "transparent",
    },
    dayNoEvent: {
        backgroundColor: "transparent",
    },
    toastDim: {
        opacity: 0.35,
    },
    daySelected: {
        backgroundColor: colors.brandPurpleDark,
        borderWidth: 0,
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    daySelectedCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
    },
    todayHighlight: {
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderActive,
    },
    todaySelected: {
        backgroundColor: colors.brandPurpleDark,
        borderWidth: 0,
    },
    todayRing: {
        borderWidth: 2,
        borderStyle: "dotted",
        borderColor: colors.borderLavenderActive,
    },
    todayRingCoach: { borderColor: CALENDAR_COACH_BORDER_COLOR, borderWidth: 0 },
    toastHighlight: {
        backgroundColor: colors.surfaceWhiteOpaque,
        borderWidth: 3,
        borderColor: colors.brandPurpleDark,
        shadowColor: colors.brandPurpleDark,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
        zIndex: 2,
    },
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
    textToday: { color: colors.brandPurpleDark, fontWeight: "700" },
    toastHighlightText: { color: colors.brandPurpleDark, fontWeight: "800" },
    textSelected: { color: colors.white, fontWeight: "700" },
    dateToastTooltip: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 30,
        elevation: 30,
    },
});

export default WeekStrip;
