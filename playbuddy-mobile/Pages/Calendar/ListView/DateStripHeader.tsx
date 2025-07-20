import { format } from 'date-fns';
import React, { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { LAVENDER_BACKGROUND } from '../../../components/styles';
// Month Header Component
export const DateStripHeader = ({ currentDate, goToPrev, goToNext }: { currentDate: Date; goToPrev: () => void; goToNext: () => void }) => (
    <View style={dateStripHeaderStyles.monthHeader}>
        <TouchableOpacity onPress={goToPrev} style={dateStripHeaderStyles.monthHeaderButtonLeft}>
            <FAIcon name="chevron-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={dateStripHeaderStyles.monthText}>{format(currentDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={goToNext} style={dateStripHeaderStyles.monthHeaderButtonRight}>
            <FAIcon name="chevron-right" size={20} color="#333" />
        </TouchableOpacity>
    </View >
);

const dateStripHeaderStyles = StyleSheet.create({
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: LAVENDER_BACKGROUND,
    },
    monthText: { fontSize: 18, fontWeight: '600', color: '#333' },
    monthHeaderButtonLeft: {
        paddingHorizontal: 8,
        paddingRight: 16,
    },
    monthHeaderButtonRight: {
        paddingHorizontal: 8,
        paddingLeft: 16,
    },
});