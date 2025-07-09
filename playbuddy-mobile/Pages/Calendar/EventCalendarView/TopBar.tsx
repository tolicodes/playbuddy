import React, { View, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { LAVENDER_BACKGROUND } from '../../../components/styles';

// Top Bar Component
export interface TopBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filtersEnabled: boolean;
    onPressFilters: () => void;
    onPressToday: () => void;
    onPressGoogleCalendar: () => void;
    onPressExpand: () => void;
    isCalendarExpanded: boolean;
    showGoogleCalendar: boolean;
}

export const TopBar = ({ searchQuery, setSearchQuery, filtersEnabled, onPressFilters, onPressToday, onPressGoogleCalendar, onPressExpand, isCalendarExpanded, showGoogleCalendar }: TopBarProps) => (
    <View style={topBarStyles.topBar}>
        <View style={topBarStyles.searchBubble}>
            <Ionicons name="search" size={20} color="#888" style={topBarStyles.searchIcon} />
            <TextInput
                style={topBarStyles.searchInput}
                placeholder="Search or filter (right)"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
            />
        </View>
        <View style={topBarStyles.topButtons}>
            {showGoogleCalendar && <TouchableOpacity style={topBarStyles.topButton} onPress={onPressGoogleCalendar}>
                <Image source={require('../images/google-calendar.png')} style={topBarStyles.googleCalendarImage} />
            </TouchableOpacity>}
            <TouchableOpacity style={topBarStyles.topButton} onPress={onPressFilters}>
                <FAIcon name={filtersEnabled ? 'times-circle' : 'filter'} size={24} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={topBarStyles.topButton} onPress={onPressExpand}>
                <FAIcon name={isCalendarExpanded ? 'angle-double-up' : 'angle-double-down'} size={24} color="#888" />
            </TouchableOpacity>
        </View>
    </View>
);

const topBarStyles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: LAVENDER_BACKGROUND,
    },
    searchBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    topButtons: { flexDirection: 'row', marginLeft: 12, justifyContent: 'flex-end' },
    topButton: {
        marginHorizontal: 4,
        backgroundColor: '#FFF',
        padding: 6,
        borderRadius: 20,
        width: 35,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    googleCalendarImage: { width: 26, height: 26 },
});