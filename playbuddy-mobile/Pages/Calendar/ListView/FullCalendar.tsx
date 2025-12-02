import React from 'react-native';
import { Calendar } from 'react-native-calendars';
import { TouchableOpacity, Text } from 'react-native';
import moment from 'moment-timezone';

const isSameDayNY = (d1: Date | string, d2: Date | string) =>
    moment(d1).tz('America/New_York').isSame(moment(d2).tz('America/New_York'), 'day');


export const FullCalendar = ({ currentDate, markedDates, onSelectDay, hasEventsOnDay, selectedDate }: any) => {
    return (
        <Calendar
            current={currentDate.toISOString()}
            markedDates={markedDates}
            onDayPress={(day: any) =>
                onSelectDay(moment.tz(day.dateString, 'America/New_York').toDate())
            }
            hideExtraDays={false}
            hideArrows
            renderHeader={() => <></>}
            dayComponent={({ date, state }: any) => {
                const iso = date.dateString;
                const selected = isSameDayNY(iso, selectedDate);
                const isDisabled = state === 'disabled';
                const hasEvent = hasEventsOnDay(iso);
                const bg = selected ? '#FFFFFF' : hasEvent ? 'rgba(156,106,222,0.7)' : 'transparent';
                const textColor = selected ? '#6A4BD8' : isDisabled ? 'rgba(255,255,255,0.5)' : '#FFFFFF';
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
                                fontSize: 12,
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
    backgroundColor: 'red',
    calendarBackground: 'transparent',
    textSectionTitleColor: '#FFFFFF',
    textSectionTitleDisabledColor: 'rgba(255,255,255,0.5)',
    selectedDayBackgroundColor: '#FFFFFF',
    selectedDayTextColor: '#6A4BD8',
    todayTextColor: '#FFFFFF',
    dayTextColor: '#FFFFFF',
    textDisabledColor: 'rgba(255,255,255,0.45)',
    dotColor: 'rgba(255,255,255,0.9)',
    selectedDotColor: '#6A4BD8',
    arrowColor: '#FFFFFF',
    disabledArrowColor: 'rgba(255,255,255,0.35)',
    monthTextColor: '#FFFFFF',
    indicatorColor: '#FFFFFF',
    textDayFontWeight: '600',
    textMonthFontWeight: '700',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 12,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 11,
};
