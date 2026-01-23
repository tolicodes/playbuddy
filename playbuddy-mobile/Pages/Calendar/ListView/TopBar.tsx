import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../components/styles';
import { useCalendarCoach } from '../../PopupManager';

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
    onSearchFocus?: () => void;
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

const CALENDAR_COACH_BORDER_COLOR = 'transparent';

// UE handled upstream
export const TopBar = ({
    searchQuery,
    setSearchQuery,
    onSearchFocus,
    filtersEnabled,
    onPressFilters,
    quickFilters,
    activeFilters = [],
    selectedQuickFilterId,
    onSelectQuickFilter,
    onPressQuickFilterMore,
    typeaheadSuggestions,
    onSelectTypeaheadSuggestion,
}: TopBarProps) => {
    const calendarCoach = useCalendarCoach();
    const showCoachOverlay = calendarCoach?.showOverlay ?? false;
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
    const filterIconColor = filtersEnabled ? colors.accentPurple : colors.textMuted;
    const filterIconName = filtersEnabled ? 'close' : 'filter';
    const showQuickFilters = isSearchExpanded;
    const hideOtherTags = activeFilters.some((filter) => filter.icon === 'tag');
    const visibleQuickFilters = (isSearchExpanded
        ? quickFilters.filter(
            (filter) =>
                !activeFilterIdSet.has(filter.id) &&
                !activeFilterLabelSet.has(normalizeLabel(filter.label))
        )
        : []).filter((filter) => {
        if (
            hideOtherTags
            && (filter.id.startsWith('tag:') || filter.id.startsWith('category:'))
        ) {
            return false;
        }
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
        onSearchFocus?.();
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
                            showCoachOverlay && topBarStyles.searchBubbleCoach,
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
                        <TouchableOpacity
                            style={[
                                topBarStyles.filterButton,
                                filtersEnabled && topBarStyles.filterButtonActive,
                                showCoachOverlay && topBarStyles.filterButtonCoach,
                            ]}
                            onPress={() => {
                                setIsInteracting(false);
                                onPressFilters();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={filtersEnabled ? "Clear filters" : "Open filters"}
                        >
                            <Ionicons name={filterIconName} size={18} color={filterIconColor} />
                        </TouchableOpacity>
                    </View>
                </View>
                {tagMatches.length > 0 && (
                    <View style={[topBarStyles.typeahead, showCoachOverlay && topBarStyles.typeaheadCoach]}>
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
                                    style={[
                                        topBarStyles.typeaheadItem,
                                        isLast && topBarStyles.typeaheadItemLast,
                                        showCoachOverlay && topBarStyles.typeaheadItemCoach,
                                    ]}
                                    onPress={() => onSelectTypeaheadSuggestion(suggestion)}
                                >
                                    <View
                                        style={[
                                            topBarStyles.typeaheadIconWrap,
                                            tone && {
                                                backgroundColor: tone.background,
                                                borderColor: tone.border,
                                            },
                                            showCoachOverlay && topBarStyles.typeaheadIconWrapCoach,
                                        ]}
                                    >
                                        <FAIcon
                                            name={iconName}
                                            size={11}
                                            color={tone ? tone.text : colors.textMuted}
                                            solid
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
                                    showCoachOverlay && topBarStyles.chipCoach,
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
                                                solid
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
                                            solid
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
                                    showCoachOverlay && topBarStyles.chipCoach,
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
                                                solid
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
                                                solid
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {isSearchExpanded && (
                            <TouchableOpacity
                                style={[
                                    topBarStyles.chip,
                                    topBarStyles.chipMore,
                                    showCoachOverlay && topBarStyles.chipCoach,
                                ]}
                                onPressIn={() => setIsInteracting(true)}
                                onPressOut={() => setIsInteracting(false)}
                                onPress={onPressQuickFilterMore}
                            >
                                <Ionicons name="filter" size={12} color={colors.textMuted} style={topBarStyles.chipIcon} />
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
        paddingTop: spacing.sm,
        backgroundColor: 'transparent',
    },
    filterPanel: {
        backgroundColor: 'transparent',
        borderRadius: radius.xl,
        padding: 0,
        borderWidth: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    filterPanelCollapsed: {
        padding: 0,
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
    typeaheadCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
    },
    typeaheadItem: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.smPlus,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeaheadItemCoach: {
        borderBottomColor: CALENDAR_COACH_BORDER_COLOR,
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
    typeaheadIconWrapCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
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
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.hero,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    searchBubbleCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
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
    filterButton: {
        marginLeft: spacing.sm,
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    filterButtonCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
    },
    filterButtonActive: {
        backgroundColor: colors.surfaceLavenderStrong,
        borderColor: colors.borderLavenderActive,
    },
    quickFiltersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
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
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        marginRight: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
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
