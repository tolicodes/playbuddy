import React, { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import moment from "moment-timezone";
import { LAVENDER_BACKGROUND, ACCENT_PURPLE, HEADER_PURPLE, WHITE, DARK_GRAY, MEDIUM_GRAY, LIGHT_GRAY, DISABLED_GRAY, BORDER_LAVENDER } from '../../../components/styles';

export const WeekStrip = ({ weekDays, selectedDate, onSelectDay, hasEventsOnDay }: any) => (
    <View style={weekStripStyles.weekStrip}>
        {weekDays.map((day: any) => {
            const selected = moment(day).tz('America/New_York').isSame(moment(selectedDate).tz('America/New_York'), 'day');
            const hasEvent = hasEventsOnDay(day);
            return (
                <TouchableOpacity
                    key={day.toISOString()}
                    style={[
                        weekStripStyles.weekDay,
                        selected && weekStripStyles.weekDaySelectedBackground,
                        hasEvent && !selected && weekStripStyles.weekDayHasEvent,
                        !hasEvent && weekStripStyles.weekDayNoEvent,
                    ]}
                    onPress={() => onSelectDay(day)}
                >
                    <Text style={[
                        weekStripStyles.weekDayText,
                        selected && weekStripStyles.weekDayTextSelected,
                        !hasEvent && weekStripStyles.weekDayNoEventText
                    ]}>
                        {moment(day).format('ddd')}
                    </Text>
                    <Text style={[
                        weekStripStyles.weekDayNumber,
                        selected && weekStripStyles.weekDayNumberSelected,
                        selected && weekStripStyles.weekDayTextSelected,
                        !hasEvent && weekStripStyles.weekDayNoEventText
                    ]}>
                        {moment(day).format('D')}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const weekStripStyles = StyleSheet.create({
    weekStrip: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: 'transparent',
    },
    weekDay: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: LAVENDER_BACKGROUND,
    },
    weekDayHasEvent: {
        backgroundColor: ACCENT_PURPLE,
    },
    weekDayNoEvent: {
        backgroundColor: '#D9C8F6',
    },
    weekDayNoEventText: {
        color: '#666',
    },
    weekDaySelectedBackground: {
        backgroundColor: LAVENDER_BACKGROUND,
    },
    weekDayText: {
        fontSize: 12,
        color: 'white',
    },
    weekDayTextSelected: {
        color: 'black',
        fontWeight: '600',
    },
    weekDayNumber: {
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },
    weekDayNumberSelected: {
        color: '#fff',
    },
});