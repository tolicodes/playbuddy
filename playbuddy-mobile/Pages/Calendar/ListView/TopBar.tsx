import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { HORIZONTAL_PADDING } from '../../../components/styles';

// All analytics in EventCalendarView

// Top Bar Component
export type ChipTone = { background: string; border: string; text: string };
export type QuickFilterItem = { id: string; label: string; icon?: string; tone?: ChipTone };
export type ActiveFilterChip = {
    id: string;
    label: string;
    icon?: string;
    tone?: ChipTone;
    onRemove: () => void;
};
export type TypeaheadSuggestionType = 'tag' | 'organizer' | 'event_type' | 'experience' | 'interactivity';
export type TypeaheadSuggestion = {
    id: string;
    label: string;
    type: TypeaheadSuggestionType;
    tone?: ChipTone;
    value?: string;
};

export interface TopBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filtersEnabled: boolean;
    onPressFilters: () => void;
    onPressGoogleCalendar: () => void;
    showGoogleCalendar: boolean;
    quickFilters: QuickFilterItem[];
    activeFilters?: ActiveFilterChip[];
    selectedQuickFilterId: string | null;
    onSelectQuickFilter: (filterId: string) => void;
    onPressQuickFilterMore: () => void;
    typeaheadSuggestions: TypeaheadSuggestion[];
    onSelectTypeaheadSuggestion: (suggestion: TypeaheadSuggestion) => void;
}

// UE handled upstream
export const TopBar = ({
    searchQuery,
    setSearchQuery,
    quickFilters,
    activeFilters = [],
    selectedQuickFilterId,
    onSelectQuickFilter,
    onPressQuickFilterMore,
    typeaheadSuggestions,
    onSelectTypeaheadSuggestion,
}: TopBarProps) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearchPinned, setIsSearchPinned] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<TextInput>(null);
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const hasActiveFilters = activeFilters.length > 0;
    const showSuggestions = isSearchFocused || searchQuery.length > 0 || isInteracting;
    const isSearchExpanded =
        isSearchPinned || isSearchFocused || searchQuery.length > 0 || hasActiveFilters || isInteracting;
    const normalizeLabel = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
    const chipKey = (label: string, icon?: string) => `${normalizeLabel(label)}|${icon || 'none'}`;
    const tagMatches = normalizedQuery.length
        ? typeaheadSuggestions
            .filter((suggestion) => suggestion.label.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
        : [];
    const activeFilterIdSet = new Set(activeFilters.map((filter) => filter.id));
    const activeFilterLabelSet = new Set(activeFilters.map((filter) => normalizeLabel(filter.label)));
    const activeFilterChipKeys = new Set<string>();
    const uniqueActiveFilters = activeFilters.filter((filter) => {
        const key = chipKey(filter.label, filter.icon);
        if (activeFilterChipKeys.has(key)) return false;
        activeFilterChipKeys.add(key);
        return true;
    });
    const showQuickFilters = isSearchExpanded;
    const visibleQuickFilters = (isSearchExpanded
        ? quickFilters.filter(
            (filter) =>
                !activeFilterIdSet.has(filter.id) &&
                !activeFilterLabelSet.has(normalizeLabel(filter.label))
        )
        : []).filter((filter) => {
        const key = chipKey(filter.label, filter.icon);
        if (activeFilterChipKeys.has(key)) return false;
        activeFilterChipKeys.add(key);
        return true;
    });

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isSearchPinned && (isSearchFocused || searchQuery.length > 0 || hasActiveFilters)) {
            setIsSearchPinned(true);
        }
    }, [hasActiveFilters, isSearchFocused, isSearchPinned, searchQuery.length]);

    const handleFocus = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setIsSearchFocused(true);
        setIsSearchPinned(true);
    };

    const handleBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            setIsSearchFocused(false);
            setIsInteracting(false);
        }, 120);
    };

    const handleRemoveFilter = (filter: ActiveFilterChip) => {
        filter.onRemove();
    };

    return (
        <View style={topBarStyles.topBar}>
            <View
                style={[
                    topBarStyles.filterPanel,
                    !isSearchExpanded && topBarStyles.filterPanelCollapsed,
                ]}
            >
                <View style={topBarStyles.topRow}>
                    <View
                        style={[
                            topBarStyles.searchBubble,
                            isSearchExpanded
                                ? topBarStyles.searchBubbleExpanded
                                : topBarStyles.searchBubbleCollapsed,
                        ]}
                    >
                        <Ionicons name="search" size={20} color="#6b6b6b" style={topBarStyles.searchIcon} />
                        <TextInput
                            ref={searchInputRef}
                            style={topBarStyles.searchInput}
                            placeholder="Search by tag or organizer"
                            placeholderTextColor="#8a8a8a"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            autoCorrect={false}
                            autoCapitalize="none"
                            clearButtonMode="while-editing"
                        />
                    </View>
                </View>
                {tagMatches.length > 0 && (
                    <View style={topBarStyles.typeahead}>
                        {tagMatches.map((suggestion, index) => {
                            const isLast = index === tagMatches.length - 1;
                            const iconName =
                                suggestion.type === 'organizer'
                                    ? 'users'
                                    : suggestion.type === 'event_type'
                                        ? 'calendar-alt'
                                        : suggestion.type === 'experience'
                                            ? 'signal'
                                            : suggestion.type === 'interactivity'
                                                ? 'hand-paper'
                                                : 'tag';
                            const tone = suggestion.tone;
                            return (
                                <TouchableOpacity
                                    key={suggestion.id}
                                    style={[topBarStyles.typeaheadItem, isLast && topBarStyles.typeaheadItemLast]}
                                    onPress={() => onSelectTypeaheadSuggestion(suggestion)}
                                >
                                    <View
                                        style={[
                                            topBarStyles.typeaheadIconWrap,
                                            tone && {
                                                backgroundColor: tone.background,
                                                borderColor: tone.border,
                                            },
                                        ]}
                                    >
                                        <FAIcon
                                            name={iconName}
                                            size={11}
                                            color={tone ? tone.text : '#6b6b6b'}
                                        />
                                    </View>
                                    <Text style={topBarStyles.typeaheadText}>{suggestion.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
                {showQuickFilters && (
                    <View style={topBarStyles.quickFiltersRow}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={topBarStyles.quickFiltersScroll}
                            contentContainerStyle={topBarStyles.quickFiltersContent}
                        >
                            {uniqueActiveFilters.map((filter) => {
                                const tone = filter.tone;
                                const chipStyle = [
                                    topBarStyles.chip,
                                    tone && {
                                        backgroundColor: tone.background,
                                        borderColor: tone.border,
                                    },
                                    !tone && topBarStyles.chipSelected,
                                    tone && {
                                        borderColor: tone.text,
                                        borderWidth: 2,
                                    },
                                ];
                                const textColor = tone?.text || '#fff';
                                return (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={chipStyle}
                                        onPressIn={() => setIsInteracting(true)}
                                        onPressOut={() => setIsInteracting(false)}
                                        onPress={() => handleRemoveFilter(filter)}
                                    >
                                        {filter.icon && (
                                            <FAIcon
                                                name={filter.icon}
                                                size={10}
                                                color={textColor}
                                                style={topBarStyles.chipIcon}
                                            />
                                        )}
                                        <Text style={[topBarStyles.chipText, { color: textColor }]}>
                                            {filter.label}
                                        </Text>
                                        <FAIcon
                                            name="times"
                                            size={9}
                                            color={textColor}
                                            style={topBarStyles.chipRemoveIcon}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                            {visibleQuickFilters.map((filter) => {
                                const selected = selectedQuickFilterId === filter.id;
                                const tone = filter.tone;
                                const showRemove =
                                    selected &&
                                    (filter.id.startsWith('tag:') ||
                                        filter.id.startsWith('organizer:') ||
                                        filter.id.startsWith('event_type:') ||
                                        filter.id.startsWith('experience:') ||
                                        filter.id.startsWith('interactivity:'));
                                const chipStyle = [
                                    topBarStyles.chip,
                                    tone && {
                                        backgroundColor: tone.background,
                                        borderColor: tone.border,
                                    },
                                    selected && !tone && topBarStyles.chipSelected,
                                    selected && tone && {
                                        borderColor: tone.text,
                                        borderWidth: 2,
                                    },
                                ];
                                const textColor = selected && !tone ? '#fff' : tone?.text || '#444';
                                return (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={chipStyle}
                                        onPressIn={() => setIsInteracting(true)}
                                        onPressOut={() => setIsInteracting(false)}
                                        onPress={() => onSelectQuickFilter(filter.id)}
                                    >
                                        {filter.icon && (
                                            <FAIcon
                                                name={filter.icon}
                                                size={10}
                                                color={textColor}
                                                style={topBarStyles.chipIcon}
                                            />
                                        )}
                                        <Text style={[topBarStyles.chipText, { color: textColor }]}>
                                            {filter.label}
                                        </Text>
                                        {showRemove && (
                                            <FAIcon
                                                name="times"
                                                size={9}
                                                color={textColor}
                                                style={topBarStyles.chipRemoveIcon}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {isSearchExpanded && (
                            <TouchableOpacity
                                style={[topBarStyles.chip, topBarStyles.chipMore]}
                                onPressIn={() => setIsInteracting(true)}
                                onPressOut={() => setIsInteracting(false)}
                                onPress={onPressQuickFilterMore}
                            >
                                <Text style={topBarStyles.chipText}>More &gt;</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
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
    filterPanel: {
        backgroundColor: '#F6F2FF',
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5DFF9',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    filterPanelCollapsed: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeaheadItemLast: {
        borderBottomWidth: 0,
    },
    typeaheadIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f3f4f7',
        borderWidth: 1,
        borderColor: '#e3e6ee',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    typeaheadText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    searchBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e7e7ef',
    },
    searchBubbleExpanded: {
        width: '100%',
    },
    searchBubbleCollapsed: {
        width: '100%',
        paddingVertical: 6,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
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
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e6e6e6',
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#444',
    },
    chipSelected: {
        backgroundColor: '#7F5AF0',
        borderColor: '#7F5AF0',
    },
    chipIcon: {
        marginRight: 6,
    },
    chipRemoveIcon: {
        marginLeft: 6,
    },
    chipMore: {
        backgroundColor: '#f3f4f7',
        borderColor: '#d8dbe2',
        marginLeft: 8,
    },
});
