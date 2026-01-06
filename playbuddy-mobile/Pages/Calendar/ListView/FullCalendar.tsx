import React from 'react-native';
import { Calendar } from 'react-native-calendars';
import { TouchableOpacity, Text } from 'react-native';
import moment from 'moment-timezone';
import { colors, fontSizes } from '../../../components/styles';

const isSameDayNY = (d1: Date | string, d2: Date | string) =>
    moment(d1).tz('America/New_York').isSame(moment(d2).tz('America/New_York'), 'day');


export const FullCalendar = ({
    currentDate,
    markedDates,
    onSelectDay,
    hasEventsOnDay,
    selectedDate,
    onMonthChange,
    enableSwipeMonths = true,
}: any) => {
    return (
        <Calendar
            current={currentDate.toISOString()}
            markedDates={markedDates}
            onDayPress={(day: any) =>
                onSelectDay(moment.tz(day.dateString, 'America/New_York').toDate())
            }
            onMonthChange={(month: any) => {
                if (!onMonthChange) return;
                const next = moment.tz(month.dateString, 'America/New_York').toDate();
                onMonthChange(next);
            }}
            hideExtraDays={false}
            hideArrows
            enableSwipeMonths={enableSwipeMonths}
            renderHeader={() => <></>}
            dayComponent={({ date, state }: any) => {
                const iso = date.dateString;
                const selected = isSameDayNY(iso, selectedDate);
                const isDisabled = state === 'disabled';
                const hasEvent = hasEventsOnDay(iso);
                const bg = selected ? colors.white : hasEvent ? colors.accentPurpleSoft : 'transparent';
                const textColor = selected ? colors.brandIndigo : isDisabled ? colors.textOnDarkSubtle : colors.white;
                return (
                    <TouchableOpacity
                        disabled={false}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: bg,
                            opacity: isDisabled ? 0.5 : 1,
                        }}
                        onPress={() => onSelectDay(moment.tz(iso, 'America/New_York').toDate())}
                    >
                        <Text
                            style={{
                                color: textColor,
                                fontWeight: '700',
                                fontSize: fontSizes.sm,
                            }}
                        >
                            {date.day}
                        </Text>
                    </TouchableOpacity>
                );
            }}
            theme={calendarTheme}
        />
    );
};

// The full calendar
const calendarTheme = {
    backgroundColor: colors.danger,
    calendarBackground: 'transparent',
    textSectionTitleColor: colors.white,
    textSectionTitleDisabledColor: colors.textOnDarkSubtle,
    selectedDayBackgroundColor: colors.white,
    selectedDayTextColor: colors.brandIndigo,
    todayTextColor: colors.white,
    dayTextColor: colors.white,
    textDisabledColor: colors.textOnDarkSubtle,
    dotColor: colors.textOnDarkStrong,
    selectedDotColor: colors.brandIndigo,
    arrowColor: colors.white,
    disabledArrowColor: colors.borderOnDark,
    monthTextColor: colors.white,
    indicatorColor: colors.white,
    textDayFontWeight: '600',
    textMonthFontWeight: '700',
    textDayHeaderFontWeight: '600',
    textDayFontSize: fontSizes.sm,
    textMonthFontSize: fontSizes.xl,
    textDayHeaderFontSize: fontSizes.xs,
};
