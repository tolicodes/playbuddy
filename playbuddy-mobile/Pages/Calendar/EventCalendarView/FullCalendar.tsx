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
            onDayPress={day => onSelectDay(new Date(day.dateString))}
            hideExtraDays={false}
            dayComponent={({ date, state }) => {
                const iso = date.dateString;
                const selected = isSameDayNY(iso, selectedDate);
                return (
                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: selected ? '#9C6ADE' : '#f7f2fa',
                            opacity: hasEventsOnDay(iso) ? 1 : 0.5,
                        }}
                        onPress={() => onSelectDay(new Date(iso))}
                    >
                        <Text
                            style={{
                                color: selected ? 'white' : state === 'disabled' ? '#ccc' : '#333',
                                fontWeight: 'bold',
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
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: '#333333',
    textSectionTitleDisabledColor: '#CCCCCC',
    selectedDayBackgroundColor: '#9C6ADE',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#9C6ADE',
    dayTextColor: '#333333',
    textDisabledColor: '#D9D9D9',
    dotColor: '#9C6ADE',
    selectedDotColor: '#FFFFFF',
    arrowColor: '#9C6ADE',
    disabledArrowColor: '#D9D9D9',
    monthTextColor: '#333333',
    indicatorColor: '#9C6ADE',
    textDayFontWeight: '300',
    textMonthFontWeight: '600',
    textDayHeaderFontWeight: '500',
    textDayFontSize: 12,
    textMonthFontSize: 14,
    textDayHeaderFontSize: 10,
};