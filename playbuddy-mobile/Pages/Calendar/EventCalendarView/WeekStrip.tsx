import React, { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import moment from "moment-timezone";
import { LAVENDER_BACKGROUND } from '../../../components/styles';
// Week Strip Component
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
                        selected && weekStripStyles.weekDaySelected,
                        hasEvent && !selected && weekStripStyles.weekDayHasEvent
                    ]}
                    onPress={() => onSelectDay(day)}
                >
                    <Text style={[
                        weekStripStyles.weekDayText,
                        selected && weekStripStyles.weekDayTextSelected
                    ]}>
                        {moment(day).format('ddd')}
                    </Text>
                    <Text style={[
                        weekStripStyles.weekDayNumber,
                        selected && weekStripStyles.weekDayNumberSelected
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
        backgroundColor: LAVENDER_BACKGROUND,
    },
    weekDay: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    weekDayHasEvent: {
        backgroundColor: '#f0e8fc',
    },
    weekDaySelected: {
        backgroundColor: '#9C6ADE',
    },
    weekDayText: {
        fontSize: 12,
        color: '#666',
    },
    weekDayTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    weekDayNumber: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    weekDayNumberSelected: {
        color: '#fff',
    },
});