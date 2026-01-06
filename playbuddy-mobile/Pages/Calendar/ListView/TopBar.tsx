import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../components/styles';

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
                        <Ionicons name="search" size={20} color={colors.textMuted} style={topBarStyles.searchIcon} />
                        <TextInput
                            ref={searchInputRef}
                            style={topBarStyles.searchInput}
                            placeholder="Search by tag or organizer"
                            placeholderTextColor={colors.textSecondary}
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
                                            color={tone ? tone.text : colors.textMuted}
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
                                const textColor = tone?.text || colors.white;
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
                                const textColor = selected && !tone ? colors.white : tone?.text || colors.textMuted;
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xs,
        paddingTop: spacing.smPlus,
        backgroundColor: 'transparent',
    },
    filterPanel: {
        backgroundColor: colors.lavenderBackground,
        borderRadius: radius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavender,
        shadowColor: colors.black,
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
        marginTop: spacing.sm,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 4,
    },
    typeaheadItem: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.smPlus,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeaheadItemLast: {
        borderBottomWidth: 0,
    },
    typeaheadIconWrap: {
        width: 24,
        height: 24,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    typeaheadText: {
        fontSize: fontSizes.base,
        fontWeight: '500',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    searchBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: radius.hero,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
    },
    searchBubbleExpanded: {
        width: '100%',
    },
    searchBubbleCollapsed: {
        width: '100%',
        paddingVertical: spacing.xsPlus,
    },
    searchIcon: { marginRight: spacing.sm },
    searchInput: { flex: 1, fontSize: fontSizes.xl, color: colors.textPrimary, fontFamily: fontFamilies.body },
    quickFiltersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    quickFiltersScroll: {
        flex: 1,
    },
    quickFiltersContent: {
        alignItems: 'center',
        paddingRight: spacing.sm,
    },
    chip: {
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xsPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginRight: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    chipSelected: {
        backgroundColor: colors.accentPurple,
        borderColor: colors.accentPurple,
    },
    chipIcon: {
        marginRight: spacing.xsPlus,
    },
    chipRemoveIcon: {
        marginLeft: spacing.xsPlus,
    },
    chipMore: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderMuted,
        marginLeft: spacing.sm,
    },
});
