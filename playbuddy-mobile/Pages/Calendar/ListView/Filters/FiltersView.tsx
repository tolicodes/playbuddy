import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TagPill } from './FilterComponents';
import { logEvent } from '../../../../Common/hooks/logger';
import { UE } from '../../../../userEventTypes';
import { useEventAnalyticsProps } from '../../../../Common/hooks/useAnalytics';
import { ActionSheet } from '../../../../components/ActionSheet';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../../components/styles';
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from '../../../../Common/types/commonTypes';
import { Event } from '../../../../commonTypes';
import { getAllClassificationsFromEvents } from '../../../../utils/getAllClassificationsFromEvents';

export type FilterState = {
    tags: string[];
    event_types: string[];
    experience_levels: string[];
    interactivity_levels: string[];
};

type TagOption = { name: string; count: number };
type OrganizerOption = { id: string; name: string; count: number };
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
    events: Event[];
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
};

export function snakeToTitle(s: string) {
    return s
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(' ');
}

const normalizeSearchText = (value?: string) =>
    value ? value.toLowerCase().replace(/[_-]+/g, ' ').trim() : '';

const normalizeValue = (value?: string | null) =>
    value ? value.toLowerCase().replace(/[\s_-]+/g, '_').trim() : '';

const isActiveEventType = (value?: string | null) =>
    !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);

const resolveEventTypeValue = (event: Event) => {
    if (event.play_party || event.type === 'play_party') return 'play_party';
    if (event.is_munch || event.type === 'munch') return 'munch';
    if (isActiveEventType(event.type)) return event.type;
    return FALLBACK_EVENT_TYPE;
};

const normalizeExperienceLevel = (value?: string | null) => {
    const normalized = normalizeValue(value || '');
    if (normalized === 'all_levels' || normalized === 'all_level' || normalized === 'all') {
        return 'all';
    }
    return normalized;
};

const getEventTypeIcon = (value: string) => {
    const key = value.toLowerCase();
    if (key.includes('play_party') || key.includes('play party')) return 'sparkles';
    if (key.includes('munch')) return 'restaurant';
    if (key.includes('retreat')) return 'leaf';
    if (key.includes('festival')) return 'musical-notes';
    if (key.includes('conference')) return 'people';
    if (key.includes('workshop') || key.includes('class')) return 'construct';
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

export const FiltersView = ({
    onApply,
    visible,
    filterOptions,
    events,
    initialFilters = {},
    onClose,
    searchQuery,
    onSearchQueryChange,
}: Props) => {
    const { height: windowHeight } = useWindowDimensions();
    const [selectedTags, setSelectedTags] = useState(initialFilters.tags || []);
    const [query, setQuery] = useState('');
    const [tagSearchFocused, setTagSearchFocused] = useState(false);
    const tagInputRef = useRef<TextInput>(null);
    const organizerInputRef = useRef<TextInput>(null);
    const [organizerSearchFocused, setOrganizerSearchFocused] = useState(false);
    const [selectedOrganizerName, setSelectedOrganizerName] = useState('');
    const [eventTypesSelected, setEventTypesSelected] = useState(initialFilters.event_types ?? []);
    const [experienceSelected, setExperienceSelected] = useState<string[]>(initialFilters.experience_levels || []);
    const [interactivitySelected, setInteractivitySelected] = useState<string[]>(initialFilters.interactivity_levels || []);
    const [showAllEventTypes, setShowAllEventTypes] = useState(false);
    const [showAllExperience, setShowAllExperience] = useState(false);
    const [showAllInteractivity, setShowAllInteractivity] = useState(false);

    const analyticsProps = useEventAnalyticsProps();

    const normalizedOrganizerQuery = searchQuery.trim().toLowerCase();
    const normalizedSearchQuery = normalizeSearchText(searchQuery);
    const normalizedSelectedTags = useMemo(
        () => selectedTags.map((tag) => tag.trim().toLowerCase()),
        [selectedTags]
    );
    const normalizedEventTypeFilters = useMemo(
        () => eventTypesSelected.map((value) => normalizeValue(value)),
        [eventTypesSelected]
    );
    const normalizedExperienceFilters = useMemo(
        () => experienceSelected.map((value) => normalizeExperienceLevel(value)),
        [experienceSelected]
    );
    const normalizedInteractivityFilters = useMemo(
        () => interactivitySelected.map((value) => normalizeValue(value)),
        [interactivitySelected]
    );
    const filteredEvents = useMemo(() => {
        if (!events.length) return [];
        return events.filter((event) => {
            if (normalizedSearchQuery.length > 0) {
                const fields: Array<string | undefined> = [
                    event.name,
                    event.organizer?.name,
                    event.description,
                    event.short_description,
                    event.type && isActiveEventType(event.type) ? event.type : undefined,
                    event.classification?.experience_level,
                    event.classification?.interactivity_level,
                ];

                if (event.play_party) fields.push('play party');
                if (event.is_munch) fields.push('munch');

                for (const tag of event.tags || []) {
                    fields.push(tag);
                }
                for (const tag of event.classification?.tags || []) {
                    fields.push(tag);
                }

                const matchesQuery = fields.some((field) =>
                    normalizeSearchText(field).includes(normalizedSearchQuery)
                );
                if (!matchesQuery) return false;
            }

            if (normalizedSelectedTags.length > 0) {
                const tags = [
                    ...(event.classification?.tags || []),
                    ...(event.tags || []),
                ].map((tag) => tag.trim().toLowerCase());
                const matchesTags = normalizedSelectedTags.some((tag) => tags.includes(tag));
                if (!matchesTags) return false;
            }

            if (normalizedEventTypeFilters.length > 0) {
                const resolvedType = resolveEventTypeValue(event);
                const normalizedType = normalizeValue(resolvedType);
                if (!normalizedType || !normalizedEventTypeFilters.includes(normalizedType)) return false;
            }

            if (normalizedExperienceFilters.length > 0) {
                const exp = normalizeExperienceLevel(event.classification?.experience_level);
                if (!normalizedExperienceFilters.includes(exp || '')) return false;
            }

            if (normalizedInteractivityFilters.length > 0) {
                const inter = normalizeValue(event.classification?.interactivity_level);
                if (!normalizedInteractivityFilters.includes(inter || '')) return false;
            }

            return true;
        });
    }, [
        events,
        normalizedExperienceFilters,
        normalizedEventTypeFilters,
        normalizedInteractivityFilters,
        normalizedSearchQuery,
        normalizedSelectedTags,
    ]);
    const filteredCounts = useMemo(
        () => getAllClassificationsFromEvents(filteredEvents),
        [filteredEvents]
    );
    const filterOptionsWithCounts = useMemo(() => {
        const normalizeKey = (value: string) => value.trim().toLowerCase();
        const applyCounts = (base: TagOption[], updated: TagOption[]) => {
            const updatedMap = new Map(
                updated.map((option) => [normalizeKey(option.name), option.count])
            );
            return base.map((option) => ({
                ...option,
                count: updatedMap.get(normalizeKey(option.name)) ?? 0,
            }));
        };
        return {
            tags: applyCounts(filterOptions.tags || [], filteredCounts.tags || []),
            event_types: applyCounts(filterOptions.event_types || [], filteredCounts.event_types || []),
            experience_levels: applyCounts(filterOptions.experience_levels || [], filteredCounts.experience_levels || []),
            interactivity_levels: applyCounts(filterOptions.interactivity_levels || [], filteredCounts.interactivity_levels || []),
        };
    }, [filterOptions, filteredCounts]);

    const uniqueTagOptions = buildTagOptions(filterOptionsWithCounts.tags || []);
    const tagCountByName = useMemo(() => {
        const map = new Map<string, number>();
        uniqueTagOptions.forEach((tag) => {
            const key = normalizeSearchText(tag.name);
            if (!key) return;
            map.set(key, tag.count);
        });
        return map;
    }, [uniqueTagOptions]);
    const filteredTagOptions = uniqueTagOptions.filter(tag =>
        tag.name.toLowerCase().includes(query.toLowerCase()) &&
        !selectedTags.includes(tag.name)
    );
    const topTagOptions = uniqueTagOptions.slice(0, 12);
    const topTagChips = topTagOptions.filter(tag => !selectedTags.includes(tag.name));
    const tagSuggestions = (query.length > 0 ? filteredTagOptions : topTagOptions)
        .filter(tag => !selectedTags.includes(tag.name));
    const showTagSuggestions = tagSearchFocused;
    const visibleTags = selectedTags.slice(0, 5);
    const hiddenTagCount = Math.max(selectedTags.length - visibleTags.length, 0);
    const activeEventTypeLabels = new Set([
        ...ACTIVE_EVENT_TYPES.map((type) => snakeToTitle(type).toLowerCase()),
        snakeToTitle(FALLBACK_EVENT_TYPE).toLowerCase(),
    ]);
    const eventTypeGroups = buildOptionGroups(filterOptionsWithCounts.event_types || [])
        .filter((group) => activeEventTypeLabels.has(group.label.toLowerCase()));
    const experienceGroups = buildOptionGroups(filterOptionsWithCounts.experience_levels || []);
    const interactivityGroups = buildOptionGroups(filterOptionsWithCounts.interactivity_levels || []);
    const visibleEventTypeGroups = showAllEventTypes ? eventTypeGroups : eventTypeGroups.slice(0, 5);
    const visibleExperienceGroups = showAllExperience ? experienceGroups : experienceGroups.slice(0, 5);
    const visibleInteractivityGroups = showAllInteractivity ? interactivityGroups : interactivityGroups.slice(0, 5);
    const hiddenEventTypeCount = Math.max(eventTypeGroups.length - visibleEventTypeGroups.length, 0);
    const hiddenExperienceCount = Math.max(experienceGroups.length - visibleExperienceGroups.length, 0);
    const hiddenInteractivityCount = Math.max(interactivityGroups.length - visibleInteractivityGroups.length, 0);
    const organizerOptionsWithCounts = useMemo(() => {
        const options = new Map<string, OrganizerOption>();
        for (const event of filteredEvents) {
            const organizer = event.organizer;
            const name = organizer?.name?.trim();
            if (!name) continue;
            const idValue = organizer?.id?.toString() || name.toLowerCase();
            const existing = options.get(idValue);
            if (existing) {
                existing.count += 1;
            } else {
                options.set(idValue, { id: idValue, name, count: 1 });
            }
        }
        return Array.from(options.values()).sort((a, b) => b.count - a.count);
    }, [filteredEvents]);
    const organizerCountByName = useMemo(() => {
        const map = new Map<string, number>();
        organizerOptionsWithCounts.forEach((option) => {
            const key = normalizeSearchText(option.name);
            if (!key) return;
            map.set(key, option.count);
        });
        return map;
    }, [organizerOptionsWithCounts]);
    const filteredOrganizerOptions = organizerOptionsWithCounts.filter((option) =>
        option.name.toLowerCase().includes(normalizedOrganizerQuery)
    );
    const organizerSuggestions = (
        normalizedOrganizerQuery.length > 0 ? filteredOrganizerOptions : organizerOptionsWithCounts
    ).slice(0, 8);
    const showOrganizerSuggestions = organizerSearchFocused;
    const selectedOrganizerCount = selectedOrganizerName
        ? organizerCountByName.get(normalizeSearchText(selectedOrganizerName))
        : undefined;
    const showTagDropdown = showTagSuggestions && tagSuggestions.length > 0;
    const showOrganizerDropdown = showOrganizerSuggestions && organizerSuggestions.length > 0;
    const showDropdownBackdrop = showTagDropdown || showOrganizerDropdown;
    const sheetHeight = Math.max(0, Math.round(windowHeight - 100));

    const dismissDropdowns = () => {
        setTagSearchFocused(false);
        setOrganizerSearchFocused(false);
        tagInputRef.current?.blur();
        organizerInputRef.current?.blur();
    };

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

    const clearAllFilters = () => {
        setSelectedTags([]);
        setEventTypesSelected([]);
        setExperienceSelected([]);
        setInteractivitySelected([]);
        setQuery('');
        setSelectedOrganizerName('');
        setTagSearchFocused(false);
        setOrganizerSearchFocused(false);
        setShowAllEventTypes(false);
        setShowAllExperience(false);
        setShowAllInteractivity(false);
        onSearchQueryChange('');
    };

    const handleTagSelected = (tag: TagOption) => {
        if (selectedTags.includes(tag.name)) return;
        logEvent(UE.FilterTagSelected, {
            ...analyticsProps,
            tag_name: tag.name,
            tag_count: tag.count,
        });
        setSelectedTags(prev => [...prev, tag.name]);
        setQuery('');
        setTagSearchFocused(false);
        tagInputRef.current?.blur();
    };

    const handleOrganizerSelected = (option: OrganizerOption) => {
        setSelectedOrganizerName(option.name);
        onSearchQueryChange(option.name);
        setOrganizerSearchFocused(false);
        organizerInputRef.current?.blur();
    };

    const handleOrganizerQueryChange = (text: string) => {
        if (
            selectedOrganizerName
            && normalizeSearchText(text) !== normalizeSearchText(selectedOrganizerName)
        ) {
            setSelectedOrganizerName('');
        }
        onSearchQueryChange(text);
    };

    useEffect(() => {
        if (!selectedOrganizerName) return;
        if (normalizeSearchText(searchQuery) !== normalizeSearchText(selectedOrganizerName)) {
            setSelectedOrganizerName('');
        }
    }, [searchQuery, selectedOrganizerName]);

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
        <ActionSheet
            visible={visible}
            height={sheetHeight}
            dismissOnBackdropPress
            onBackdropPress={applyFilters}
        >
            <View style={styles.sheetContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerText}>Filter Events</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                    {showDropdownBackdrop && (
                        <Pressable
                            style={styles.dropdownBackdrop}
                            onPress={dismissDropdowns}
                            accessibilityLabel="Dismiss dropdown"
                        />
                    )}
                    <View style={styles.searchSection}>
                        <Text style={styles.searchLabel}>Search by Tag</Text>
                        <Text style={styles.searchHelper}>Type to search or tap a tag below</Text>
                        <View style={styles.tagSearchWrap}>
                            <TextInput
                                ref={tagInputRef}
                                style={styles.searchInput}
                                placeholder={selectedTags.length === 0 ? 'Tags' : ''}
                                value={query}
                                onChangeText={onChangeSearch}
                                onFocus={() => setTagSearchFocused(true)}
                                onBlur={() => setTagSearchFocused(false)}
                            />
                            {showTagDropdown && (
                                <View style={styles.tagDropdown}>
                                    <ScrollView
                                        keyboardShouldPersistTaps="handled"
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {tagSuggestions.map(tag => (
                                            <TouchableOpacity
                                                key={tag.name}
                                                style={styles.tagDropdownItem}
                                                onPress={() => handleTagSelected(tag)}
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
                                    count={tagCountByName.get(normalizeSearchText(tag))}
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

                        {selectedTags.length === 0 && topTagChips.length > 0 && (
                            <View style={styles.topTagsSection}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.topTagsScroll}
                                >
                                    {topTagChips.map(tag => (
                                        <TouchableOpacity
                                            key={tag.name}
                                            onPress={() => handleTagSelected(tag)}
                                            activeOpacity={0.8}
                                        >
                                            <TagPill label={tag.name} variant="suggestion" count={tag.count} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        <View style={styles.organizerSearchWrap}>
                            <Text style={styles.searchLabel}>Search by organizer</Text>
                            <View style={styles.searchInputWrap}>
                                <TextInput
                                    ref={organizerInputRef}
                                    style={[styles.searchInput, styles.searchInputWithClear]}
                                    placeholder="Organizer name"
                                    value={searchQuery}
                                    onChangeText={handleOrganizerQueryChange}
                                    onFocus={() => setOrganizerSearchFocused(true)}
                                    onBlur={() => setOrganizerSearchFocused(false)}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    clearButtonMode="never"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.searchClearButton}
                                        onPress={() => {
                                            setSelectedOrganizerName('');
                                            onSearchQueryChange('');
                                            organizerInputRef.current?.focus();
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Clear organizer search"
                                    >
                                        <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {selectedOrganizerName.length > 0 && (
                                <View style={styles.organizerChipRow}>
                                    <TagPill
                                        label={selectedOrganizerName}
                                        count={selectedOrganizerCount}
                                        onRemove={() => {
                                            setSelectedOrganizerName('');
                                            onSearchQueryChange('');
                                        }}
                                    />
                                </View>
                            )}
                            {showOrganizerDropdown && (
                                <View style={styles.organizerDropdown}>
                                    <ScrollView
                                        keyboardShouldPersistTaps="handled"
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {organizerSuggestions.map(option => (
                                            <TouchableOpacity
                                                key={option.id}
                                                style={styles.tagDropdownItem}
                                                onPress={() => handleOrganizerSelected(option)}
                                            >
                                                <Text style={styles.tagDropdownText}>{option.name}</Text>
                                                <View style={styles.tagDropdownCount}>
                                                    <Text style={styles.tagDropdownCountText}>{option.count}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
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
                                        <View style={styles.optionLabelRow}>
                                            <View
                                                style={[
                                                    styles.optionIconWrap,
                                                    selected && styles.optionIconWrapSelected,
                                                ]}
                                            >
                                                <Ionicons
                                                    name={getEventTypeIcon(group.label)}
                                                    size={12}
                                                    color={selected ? colors.white : colors.brandPurpleDark}
                                                />
                                            </View>
                                            <Text
                                                numberOfLines={1}
                                                style={[styles.optionText, selected && styles.optionTextSelected]}
                                            >
                                                {group.label}
                                            </Text>
                                        </View>
                                        <Text style={[styles.optionCount, selected && styles.optionCountSelected]}>
                                            {group.count}
                                        </Text>
                                    </View>
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
                                        <View style={styles.optionLabelRow}>
                                            <View
                                                style={[
                                                    styles.optionIconWrap,
                                                    selected && styles.optionIconWrapSelected,
                                                ]}
                                            >
                                                <Ionicons
                                                    name={getExperienceIcon(group.label)}
                                                    size={12}
                                                    color={selected ? colors.white : colors.brandPurpleDark}
                                                />
                                            </View>
                                            <Text
                                                numberOfLines={1}
                                                style={[styles.optionText, selected && styles.optionTextSelected]}
                                            >
                                                {group.label}
                                            </Text>
                                        </View>
                                        <Text style={[styles.optionCount, selected && styles.optionCountSelected]}>
                                            {group.count}
                                        </Text>
                                    </View>
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
                                        <View style={styles.optionLabelRow}>
                                            <View
                                                style={[
                                                    styles.optionIconWrap,
                                                    selected && styles.optionIconWrapSelected,
                                                ]}
                                            >
                                                <Ionicons
                                                    name={getInteractivityIcon(group.label)}
                                                    size={12}
                                                    color={selected ? colors.white : colors.brandPurpleDark}
                                                />
                                            </View>
                                            <Text
                                                numberOfLines={1}
                                                style={[styles.optionText, selected && styles.optionTextSelected]}
                                            >
                                                {group.label}
                                            </Text>
                                        </View>
                                        <Text style={[styles.optionCount, selected && styles.optionCountSelected]}>
                                            {group.count}
                                        </Text>
                                    </View>
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

                <View style={styles.footerActions}>
                    <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
                        <Text style={styles.clearAllText}>Clear all</Text>
                    </TouchableOpacity>
                </View>
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
    dropdownBackdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    scrollContent: {
        flex: 1,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    scrollInner: {
        paddingBottom: spacing.jumbo,
        position: 'relative',
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
    organizerSearchWrap: {
        marginTop: spacing.mdPlus,
        position: 'relative',
        zIndex: 9,
        elevation: 4,
    },
    organizerChipRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    searchLabel: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xsPlus,
    },
    searchHelper: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xsPlus,
    },
    tagSearchWrap: {
        position: 'relative',
        zIndex: 10,
        elevation: 5,
    },
    searchInputWrap: {
        position: 'relative',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        height: 38,
        backgroundColor: colors.surfaceWhiteOpaque,
        fontFamily: fontFamilies.body,
        color: colors.textDeep,
    },
    searchInputWithClear: {
        paddingRight: 36,
    },
    searchClearButton: {
        position: 'absolute',
        right: spacing.sm,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
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
    organizerDropdown: {
        position: 'relative',
        marginTop: spacing.xsPlus,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        maxHeight: 200,
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
    topTagsSection: {
        marginTop: spacing.sm,
    },
    topTagsScroll: {
        flexDirection: 'row',
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
        minHeight: 42,
        borderRadius: radius.md,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.smPlus,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        justifyContent: 'center',
        marginBottom: spacing.smPlus,
    },
    optionButtonSelected: {
        backgroundColor: colors.accentPurple,
        borderColor: colors.accentPurple,
    },
    optionText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
        flexShrink: 1,
    },
    optionTextSelected: {
        color: colors.white,
    },
    optionCount: {
        marginLeft: spacing.sm,
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexShrink: 1,
    },
    optionIconWrap: {
        width: 22,
        height: 22,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
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
        minHeight: 42,
        borderRadius: radius.md,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.smPlus,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.smPlus,
    },
    optionMoreText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    footerActions: {
        marginBottom: spacing.sm,
    },
    clearAllButton: {
        width: '100%',
        paddingVertical: spacing.smPlus,
        borderRadius: radius.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        alignItems: 'center',
    },
    clearAllText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
    },
    applyButton: {
        backgroundColor: colors.black,
        paddingVertical: spacing.lg,
        minHeight: 56,
        borderRadius: radius.lg,
        justifyContent: 'center',
        ...shadows.button,
    },
    applyText: {
        textAlign: 'center',
        color: colors.white,
        fontWeight: '600',
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
});
