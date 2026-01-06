import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TagPill } from './FilterComponents';
import { logEvent } from '../../../../Common/hooks/logger';
import { UE } from '../../../../userEventTypes';
import { useEventAnalyticsProps } from '../../../../Common/hooks/useAnalytics';
import { ActionSheet } from '../../../../components/ActionSheet';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../../components/styles';

export type FilterState = {
    tags: string[];
    event_types: string[];
    experience_levels: string[];
    interactivity_levels: string[];
};

type TagOption = { name: string; count: number };
type OptionGroup = { label: string; count: number; values: string[] };

type FilterOptions = {
    tags: TagOption[];
    event_types: TagOption[];
    experience_levels: TagOption[];
    interactivity_levels: TagOption[];
};

type Props = {
    onApply: (filters: FilterState) => void;
    visible: boolean;
    initialFilters?: Partial<FilterState>;
    onClose: () => void;
    filterOptions: FilterOptions;
};

export function snakeToTitle(s: string) {
    return s
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(' ');
}

const getEventTypeIcon = (value: string) => {
    const key = value.toLowerCase();
    if (key.includes('play_party') || key.includes('play party')) return 'sparkles';
    if (key.includes('munch')) return 'restaurant';
    if (key.includes('retreat')) return 'leaf';
    if (key.includes('festival')) return 'musical-notes';
    if (key.includes('workshop') || key.includes('class')) return 'construct';
    if (key.includes('performance')) return 'mic';
    if (key.includes('discussion')) return 'chatbubbles';
    return 'calendar';
};

const getExperienceIcon = (value: string) => {
    const key = value.toLowerCase();
    if (key.includes('beginner')) return 'school';
    if (key.includes('intermediate')) return 'trending-up';
    if (key.includes('advanced')) return 'rocket';
    return 'stats-chart';
};

const getInteractivityIcon = (value: string) => {
    const key = value.toLowerCase();
    if (key.includes('social')) return 'people';
    if (key.includes('discussion')) return 'chatbubbles';
    if (key.includes('intimate')) return 'heart';
    if (key.includes('sensual')) return 'hand-left';
    if (key.includes('erotic') || key.includes('sexual')) return 'flame';
    if (key.includes('extreme')) return 'warning';
    if (key.includes('hands')) return 'hand-left';
    if (key.includes('performance')) return 'mic';
    if (key.includes('observational')) return 'eye';
    return 'people';
};

const buildOptionGroups = (options: TagOption[]) => {
    const grouped = new Map<string, OptionGroup>();
    options.forEach(({ name, count }) => {
        const label = snakeToTitle(name.trim());
        const key = label.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
            existing.count += count;
            existing.values.push(name);
        } else {
            grouped.set(key, { label, count, values: [name] });
        }
    });
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
};

const buildTagOptions = (options: TagOption[]) => {
    const grouped = new Map<string, TagOption>();
    options.forEach(({ name, count }) => {
        const trimmed = name.trim();
        const key = trimmed.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
            existing.count += count;
        } else {
            grouped.set(key, { name: trimmed, count });
        }
    });
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
};

export const FiltersView = ({ onApply, visible, filterOptions, initialFilters = {}, onClose }: Props) => {
    const [selectedTags, setSelectedTags] = useState(initialFilters.tags || []);
    const [query, setQuery] = useState('');
    const [tagSearchFocused, setTagSearchFocused] = useState(false);
    const [eventTypesSelected, setEventTypesSelected] = useState(initialFilters.event_types || ['Events']);
    const [experienceSelected, setExperienceSelected] = useState<string[]>(initialFilters.experience_levels || []);
    const [interactivitySelected, setInteractivitySelected] = useState<string[]>(initialFilters.interactivity_levels || []);
    const [showAllEventTypes, setShowAllEventTypes] = useState(false);
    const [showAllExperience, setShowAllExperience] = useState(false);
    const [showAllInteractivity, setShowAllInteractivity] = useState(false);

    const analyticsProps = useEventAnalyticsProps();

    const uniqueTagOptions = buildTagOptions(filterOptions.tags || []);
    const filteredTagOptions = uniqueTagOptions.filter(tag =>
        tag.name.toLowerCase().includes(query.toLowerCase()) &&
        !selectedTags.includes(tag.name)
    );
    const topTagOptions = uniqueTagOptions.slice(0, 12);
    const tagSuggestions = (query.length > 0 ? filteredTagOptions : topTagOptions)
        .filter(tag => !selectedTags.includes(tag.name));
    const showTagSuggestions = tagSearchFocused || query.length > 0;
    const visibleTags = selectedTags.slice(0, 3);
    const hiddenTagCount = Math.max(selectedTags.length - visibleTags.length, 0);
    const eventTypeGroups = buildOptionGroups(filterOptions.event_types || [])
        .filter((group) => !['event', 'events'].includes(group.label.toLowerCase()));
    const experienceGroups = buildOptionGroups(filterOptions.experience_levels || []);
    const interactivityGroups = buildOptionGroups(filterOptions.interactivity_levels || []);
    const visibleEventTypeGroups = showAllEventTypes ? eventTypeGroups : eventTypeGroups.slice(0, 3);
    const visibleExperienceGroups = showAllExperience ? experienceGroups : experienceGroups.slice(0, 3);
    const visibleInteractivityGroups = showAllInteractivity ? interactivityGroups : interactivityGroups.slice(0, 3);
    const hiddenEventTypeCount = Math.max(eventTypeGroups.length - visibleEventTypeGroups.length, 0);
    const hiddenExperienceCount = Math.max(experienceGroups.length - visibleExperienceGroups.length, 0);
    const hiddenInteractivityCount = Math.max(interactivityGroups.length - visibleInteractivityGroups.length, 0);

    const toggleGroupSelection = (
        current: string[],
        setFn: React.Dispatch<React.SetStateAction<string[]>>,
        values: string[]
    ) => {
        setFn(prev => {
            const hasAny = values.some((value) => prev.includes(value));
            if (hasAny) {
                return prev.filter((value) => !values.includes(value));
            }
            return [...prev, ...values.filter((value) => !prev.includes(value))];
        });
    };

    const clearTags = () => {
        setSelectedTags([]);
        setQuery('');
    };

    const applyFilters = () => {
        setSelectedTags([]);
        setEventTypesSelected([]);
        setExperienceSelected([]);
        setInteractivitySelected([]);
        setQuery('');

        // handled upstream
        onApply({
            tags: selectedTags,
            event_types: eventTypesSelected,
            experience_levels: experienceSelected,
            interactivity_levels: interactivitySelected,
        });
        onClose();
    };

    const onChangeSearch = (text: string) => {
        logEvent(UE.FilterSearchChanged, {
            ...analyticsProps,
            search_text: text,
        });
        setQuery(text);
    }

    return (
        <ActionSheet visible={visible}>
            <View style={styles.sheetContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerText}>Filter Events</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                    <View style={styles.searchSection}>
                        <View style={styles.tagSearchWrap}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={selectedTags.length === 0 ? 'Tags' : ''}
                                value={query}
                                onChangeText={onChangeSearch}
                                onFocus={() => setTagSearchFocused(true)}
                                onBlur={() => setTagSearchFocused(false)}
                            />
                            {showTagSuggestions && tagSuggestions.length > 0 && (
                                <View style={styles.tagDropdown}>
                                    <ScrollView
                                        keyboardShouldPersistTaps="handled"
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {tagSuggestions.map(tag => (
                                            <TouchableOpacity
                                                key={tag.name}
                                                style={styles.tagDropdownItem}
                                                onPress={() => {
                                                    logEvent(UE.FilterTagSelected, {
                                                        ...analyticsProps,
                                                        tag_name: tag.name,
                                                        tag_count: tag.count,
                                                    });
                                                    setSelectedTags(prev => [...prev, tag.name]);
                                                    setQuery('');
                                                    setTagSearchFocused(false);
                                                }}
                                            >
                                                <Text style={styles.tagDropdownText}>{tag.name}</Text>
                                                <View style={styles.tagDropdownCount}>
                                                    <Text style={styles.tagDropdownCountText}>{tag.count}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <ScrollView horizontal style={styles.tagsScroll} showsHorizontalScrollIndicator={false}>
                            {visibleTags.map(tag => (
                                <TagPill
                                    key={tag}
                                    label={tag}
                                    onRemove={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                                />
                            ))}
                            {hiddenTagCount > 0 && (
                                <TagPill key="tag-overflow" label={`... ${hiddenTagCount} more`} />
                            )}
                        </ScrollView>

                        {selectedTags.length > 0 && (
                            <TouchableOpacity onPress={clearTags} style={styles.clearTags}>
                                <Text style={styles.clearText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.sectionLabel}>Event Type</Text>
                    <View style={styles.optionGrid}>
                        {visibleEventTypeGroups.map((group) => {
                            const selected = group.values.some((value) => eventTypesSelected.includes(value));
                            return (
                                <TouchableOpacity
                                    key={group.label}
                                    style={[
                                        styles.optionButton,
                                        selected && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => toggleGroupSelection(eventTypesSelected, setEventTypesSelected, group.values)}
                                >
                                    <View style={styles.optionHeader}>
                                        <View
                                            style={[
                                                styles.optionIconWrap,
                                                selected && styles.optionIconWrapSelected,
                                            ]}
                                        >
                                            <Ionicons
                                                name={getEventTypeIcon(group.label)}
                                                size={16}
                                                color={selected ? colors.white : colors.brandPurpleDark}
                                            />
                                        </View>
                                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                            {group.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.optionCount, selected && styles.optionCountSelected]}>
                                        {group.count}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {!showAllEventTypes && hiddenEventTypeCount > 0 && (
                            <TouchableOpacity
                                style={styles.optionMoreButton}
                                onPress={() => setShowAllEventTypes(true)}
                            >
                                <Text style={styles.optionMoreText}>... {hiddenEventTypeCount} more</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.sectionLabel}>Experience</Text>
                    <View style={styles.optionGrid}>
                        {visibleExperienceGroups.map((group) => {
                            const selected = group.values.some((value) => experienceSelected.includes(value));
                            return (
                                <TouchableOpacity
                                    key={group.label}
                                    style={[
                                        styles.optionButton,
                                        selected && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => toggleGroupSelection(experienceSelected, setExperienceSelected, group.values)}
                                >
                                    <View style={styles.optionHeader}>
                                        <View
                                            style={[
                                                styles.optionIconWrap,
                                                selected && styles.optionIconWrapSelected,
                                            ]}
                                        >
                                            <Ionicons
                                                name={getExperienceIcon(group.label)}
                                                size={16}
                                                color={selected ? colors.white : colors.brandPurpleDark}
                                            />
                                        </View>
                                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                            {group.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.optionCount, selected && styles.optionCountSelected]}>
                                        {group.count}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {!showAllExperience && hiddenExperienceCount > 0 && (
                            <TouchableOpacity
                                style={styles.optionMoreButton}
                                onPress={() => setShowAllExperience(true)}
                            >
                                <Text style={styles.optionMoreText}>... {hiddenExperienceCount} more</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.sectionLabel}>Interactivity</Text>
                    <View style={styles.optionGrid}>
                        {visibleInteractivityGroups.map((group) => {
                            const selected = group.values.some((value) => interactivitySelected.includes(value));
                            return (
                                <TouchableOpacity
                                    key={group.label}
                                    style={[
                                        styles.optionButton,
                                        selected && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => toggleGroupSelection(interactivitySelected, setInteractivitySelected, group.values)}
                                >
                                    <View style={styles.optionHeader}>
                                        <View
                                            style={[
                                                styles.optionIconWrap,
                                                selected && styles.optionIconWrapSelected,
                                            ]}
                                        >
                                            <Ionicons
                                                name={getInteractivityIcon(group.label)}
                                                size={16}
                                                color={selected ? colors.white : colors.brandPurpleDark}
                                            />
                                        </View>
                                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                            {group.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.optionCount, selected && styles.optionCountSelected]}>
                                        {group.count}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {!showAllInteractivity && hiddenInteractivityCount > 0 && (
                            <TouchableOpacity
                                style={styles.optionMoreButton}
                                onPress={() => setShowAllInteractivity(true)}
                            >
                                <Text style={styles.optionMoreText}>... {hiddenInteractivityCount} more</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                <TouchableOpacity onPress={applyFilters} style={styles.applyButton}>
                    <Text style={styles.applyText}>Apply Filters</Text>
                </TouchableOpacity>
            </View>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheetContainer: {
        height: '100%',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        backgroundColor: colors.white,
    },
    scrollContent: {
        flex: 1,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    scrollInner: {
        paddingBottom: spacing.jumbo,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        fontWeight: '600',
        fontSize: fontSizes.xxl,
        fontFamily: fontFamilies.body,
    },
    searchSection: {
        marginVertical: spacing.lg,
        position: 'relative',
        zIndex: 30,
        elevation: 6,
    },
    tagSearchWrap: {
        position: 'relative',
        zIndex: 10,
        elevation: 5,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: colors.borderMuted,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        height: 40,
        fontFamily: fontFamilies.body,
        color: colors.textDeep,
    },
    tagDropdown: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 46,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        maxHeight: 200,
        zIndex: 20,
        ...shadows.card,
        elevation: 8,
        overflow: 'hidden',
    },
    tagDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.smPlus,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLavenderSoft,
        backgroundColor: colors.white,
    },
    tagDropdownText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
    },
    tagDropdownCount: {
        backgroundColor: colors.surfaceLavenderAlt,
        borderRadius: radius.smPlus,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
    },
    tagDropdownCountText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    tagsScroll: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    clearTags: {
        alignSelf: 'flex-end',
        marginTop: spacing.xs,
    },
    clearText: {
        color: colors.textSecondary,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
    sectionLabel: {
        fontWeight: '600',
        fontSize: fontSizes.xl,
        marginBottom: spacing.xsPlus,
        fontFamily: fontFamilies.body,
    },
    optionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    optionButton: {
        width: '48%',
        minHeight: 56,
        borderRadius: radius.md,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.lavenderBackground,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        justifyContent: 'center',
        marginBottom: spacing.smPlus,
    },
    optionButtonSelected: {
        backgroundColor: colors.accentPurple,
        borderColor: colors.accentPurple,
    },
    optionText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
    },
    optionTextSelected: {
        color: colors.white,
    },
    optionCount: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    optionIconWrap: {
        width: 26,
        height: 26,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceLavender,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionIconWrapSelected: {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.borderOnDark,
    },
    optionCountSelected: {
        color: colors.surfaceLavenderAlt,
    },
    optionMoreButton: {
        width: '48%',
        minHeight: 52,
        borderRadius: radius.md,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surfaceLavender,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.smPlus,
    },
    optionMoreText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    applyButton: {
        backgroundColor: colors.black,
        paddingVertical: spacing.mdPlus,
        borderRadius: radius.lg,
    },
    applyText: {
        textAlign: 'center',
        color: colors.white,
        fontWeight: '600',
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
});
