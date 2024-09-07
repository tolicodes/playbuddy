import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

export interface CustomCalendarDayProps {
    date: any;
    state: 'selected' | 'disabled' | 'today' | undefined;
    marking: { marked?: boolean, dotColor?: string[] } | undefined;
    onPress: (date: any) => void;
}

// Calendar day component with dots representing events
export const CustomCalendarDay: React.FC<CustomCalendarDayProps> = ({ date, state, marking, onPress }) => {
    return (
        // Click on date triggers onPress, which scrolls to that date
        <TouchableOpacity onPress={() => onPress(date)}>
            <View style={styles.dayContainer}>
                {/* Display the day number, with special styling for selected days */}
                <Text style={[styles.dayText, state === 'selected' && styles.selectedDayText]}>
                    {date.day}
                </Text>
                {/* Dots container for events */}
                <View style={styles.dotsContainer}>
                    {marking?.dotColor && marking.dotColor.slice(0, 5).map((color, i) => (
                        // Dots with unique keys
                        <View
                            key={`${color}-${i}`} // Combining color and index to create a unique key
                            style={[styles.dot, { backgroundColor: color || '#000', marginRight: 4 }]} />
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    dayContainer: {
        height: 20, // Adjust this value as needed
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 14, // Adjust this value as needed
    },
    selectedDayText: {
        color: 'blue',
        fontWeight: 'bold',
    },
    dotsContainer: {
        display: 'flex',
        flexDirection: 'row',
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 1,
    },
});
