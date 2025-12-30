import React, { View, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HORIZONTAL_PADDING } from '../../../components/styles';

// All analytics in EventCalendarView

// Top Bar Component
export type QuickFilterItem = { id: string; label: string };

export interface TopBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filtersEnabled: boolean;
    onPressFilters: () => void;
    onPressGoogleCalendar: () => void;
    showGoogleCalendar: boolean;
    quickFilters: QuickFilterItem[];
    selectedQuickFilterId: string | null;
    onSelectQuickFilter: (filterId: string) => void;
    onPressQuickFilterMore: () => void;
    tagSuggestions: string[];
    onSelectTagSuggestion: (tag: string) => void;
}

// UE handled upstream
export const TopBar = ({
    searchQuery,
    setSearchQuery,
    filtersEnabled,
    onPressFilters,
    onPressGoogleCalendar,
    showGoogleCalendar,
    quickFilters,
    selectedQuickFilterId,
    onSelectQuickFilter,
    onPressQuickFilterMore,
    tagSuggestions,
    onSelectTagSuggestion,
}: TopBarProps) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const tagMatches = normalizedQuery.length
        ? tagSuggestions
            .filter((tag) => tag.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
        : [];

    return (
        <View style={topBarStyles.topBar}>
            <View style={topBarStyles.topRow}>
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
                    {showGoogleCalendar && (
                        <TouchableOpacity style={topBarStyles.topButton} onPress={onPressGoogleCalendar}>
                            <Image source={require('../images/google-calendar.png')} style={topBarStyles.googleCalendarImage} />
                        </TouchableOpacity>
                    )}
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
                </View>
            </View>
            {tagMatches.length > 0 && (
                <View style={topBarStyles.typeahead}>
                    {tagMatches.map((tag, index) => {
                        const isLast = index === tagMatches.length - 1;
                        return (
                            <TouchableOpacity
                                key={tag}
                                style={[topBarStyles.typeaheadItem, isLast && topBarStyles.typeaheadItemLast]}
                                onPress={() => onSelectTagSuggestion(tag)}
                            >
                                <Text style={topBarStyles.typeaheadText}>{tag}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
            <View style={topBarStyles.quickFiltersRow}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={topBarStyles.quickFiltersScroll}
                    contentContainerStyle={topBarStyles.quickFiltersContent}
                >
                    {quickFilters.map((filter) => {
                        const selected = selectedQuickFilterId === filter.id;
                        return (
                            <TouchableOpacity
                                key={filter.id}
                                style={[topBarStyles.chip, selected && topBarStyles.chipSelected]}
                                onPress={() => onSelectQuickFilter(filter.id)}
                            >
                                <Text style={[topBarStyles.chipText, selected && topBarStyles.chipTextSelected]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <TouchableOpacity
                    style={[topBarStyles.chip, topBarStyles.chipMore]}
                    onPress={onPressQuickFilterMore}
                >
                    <Text style={topBarStyles.chipText}>More &gt;</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const topBarStyles = StyleSheet.create({
    topBar: {
        flexDirection: 'column',
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: 'transparent',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeahead: {
        marginTop: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ececec',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 4,
    },
    typeaheadItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    typeaheadItemLast: {
        borderBottomWidth: 0,
    },
    typeaheadText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
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
    quickFiltersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    quickFiltersScroll: {
        flex: 1,
    },
    quickFiltersContent: {
        alignItems: 'center',
        paddingRight: 8,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e6e6e6',
        marginRight: 8,
    },
    chipSelected: {
        backgroundColor: '#7F5AF0',
        borderColor: '#7F5AF0',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#444',
    },
    chipTextSelected: {
        color: '#fff',
    },
    chipMore: {
        backgroundColor: '#f3f4f7',
        borderColor: '#d8dbe2',
        marginLeft: 8,
    },
});
