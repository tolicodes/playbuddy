import { format } from 'date-fns';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

export const DateStripHeader = ({
    currentDate,
    goToPrev,
    goToNext,
    goToToday,
}: {
    currentDate: Date;
    goToPrev: () => void;
    goToNext: () => void;
    goToToday: () => void;
}) => (
    <View style={styles.headerWrap}>
        {/* Left spacer to balance the Today button */}
        <View style={styles.sideSpacer} />

        {/* Center group (pager) */}
        <View style={styles.centerGroup}>
            <TouchableOpacity
                onPress={goToPrev}
                style={styles.arrowBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Previous month"
            >
                <FAIcon name="chevron-left" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.monthText}>{format(currentDate, 'MMMM yyyy')}</Text>

            <TouchableOpacity
                onPress={goToNext}
                style={styles.arrowBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Next month"
            >
                <FAIcon name="chevron-right" size={18} color="#fff" />
            </TouchableOpacity>
        </View>

        {/* Today button on right */}
        <TouchableOpacity
            onPress={goToToday}
            style={styles.todayPill}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Jump to today"
        >
            <FAIcon name="calendar-day" size={14} color="#fff" />
            <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    headerWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // keeps symmetry
        paddingHorizontal: 12,
        marginTop: 10,
    },
    sideSpacer: {
        width: 70, // reserve space equal to Today button’s width
    },
    centerGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginHorizontal: 6,
    },
    arrowBtn: { padding: 6 },
    todayPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    todayText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});
