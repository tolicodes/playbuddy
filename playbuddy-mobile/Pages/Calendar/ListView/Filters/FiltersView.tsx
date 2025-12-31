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
                                                color={selected ? '#FFFFFF' : '#5A43B5'}
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
                                                color={selected ? '#FFFFFF' : '#5A43B5'}
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
                                                color={selected ? '#FFFFFF' : '#5A43B5'}
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
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flex: 1,
        marginTop: 12,
        marginBottom: 20,
    },
    scrollInner: {
        paddingBottom: 40,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        fontWeight: '600',
        fontSize: 18,
    },
    searchSection: {
        marginVertical: 16,
    },
    tagSearchWrap: {
        position: 'relative',
        zIndex: 10,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
    },
    tagDropdown: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 46,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6E0F5',
        maxHeight: 200,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    tagDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EDF8',
    },
    tagDropdownText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C2C34',
    },
    tagDropdownCount: {
        backgroundColor: '#F2ECFF',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#E1DAF7',
    },
    tagDropdownCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5A43B5',
    },
    tagsScroll: {
        marginTop: 8,
        flexDirection: 'row',
        gap: 8,
    },
    clearTags: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    clearText: {
        color: '#888',
        fontSize: 12,
    },
    sectionLabel: {
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 6,
    },
    optionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    optionButton: {
        width: '48%',
        minHeight: 56,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F6F2FF',
        borderWidth: 1,
        borderColor: '#E1DAF7',
        justifyContent: 'center',
        marginBottom: 10,
    },
    optionButtonSelected: {
        backgroundColor: '#7F5AF0',
        borderColor: '#7F5AF0',
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C2C34',
    },
    optionTextSelected: {
        color: '#FFFFFF',
    },
    optionCount: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#EFE9FF',
        borderWidth: 1,
        borderColor: '#DDD5FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionIconWrapSelected: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderColor: 'rgba(255,255,255,0.4)',
    },
    optionCountSelected: {
        color: '#EDE9FF',
    },
    optionMoreButton: {
        width: '48%',
        minHeight: 52,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F0EDF8',
        borderWidth: 1,
        borderColor: '#E1DAF7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionMoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5A43B5',
    },
    applyButton: {
        backgroundColor: '#000',
        paddingVertical: 14,
        borderRadius: 16,
    },
    applyText: {
        textAlign: 'center',
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});
