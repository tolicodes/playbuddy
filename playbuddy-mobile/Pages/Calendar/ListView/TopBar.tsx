import React, { View, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HORIZONTAL_PADDING, LAVENDER_BACKGROUND } from '../../../components/styles';

// All analytics in EventCalendarView

// Top Bar Component
export interface TopBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filtersEnabled: boolean;
    onPressFilters: () => void;
    onPressGoogleCalendar: () => void;
    onPressExpand: () => void;
    isCalendarExpanded: boolean;
    showGoogleCalendar: boolean;
}

// UE handled upstream
export const TopBar = ({ searchQuery, setSearchQuery, filtersEnabled, onPressFilters, onPressGoogleCalendar, onPressExpand, isCalendarExpanded, showGoogleCalendar }: TopBarProps) => (
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
            <TouchableOpacity
                style={[
                    topBarStyles.filterButton,
                    filtersEnabled && topBarStyles.filterButtonActive,
                ]}
                onPress={onPressFilters}
            >
                <FAIcon
                    name={filtersEnabled ? 'times' : 'filter'}
                    size={18}
                    color={filtersEnabled ? '#fff' : '#666'}
                    accessibilityLabel={filtersEnabled ? 'Clear filters' : 'Filter'}
                />
            </TouchableOpacity>

            {/* <TouchableOpacity style={topBarStyles.topButton} onPress={onPressExpand}>
                <FAIcon name={isCalendarExpanded ? 'angle-double-up' : 'angle-double-down'}
                    size={24}
                    color="#888"
                    accessibilityLabel={isCalendarExpanded ? 'Collapse calendar' : 'Expand calendar'} />
            </TouchableOpacity> */}
        </View>
    </View>
);

const topBarStyles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: 'transparent',
    },
    searchBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: HORIZONTAL_PADDING,
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
    googleCalendarImage: { width: 20, height: 20 },
    filterButton: {
        marginHorizontal: 4,
        paddingVertical: 6,
        paddingHorizontal: HORIZONTAL_PADDING,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterButtonActive: {
        backgroundColor: '#7F5AF0', // PlayBuddy purple
    },
});