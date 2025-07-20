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
import { TagPill, Pill } from './FilterComponents';
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
        .split('_')
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(' ');
}


export const FiltersView = ({ onApply, visible, filterOptions, initialFilters = {}, onClose }: Props) => {
    const [selectedTags, setSelectedTags] = useState(initialFilters.tags || []);
    const [query, setQuery] = useState('');
    const [eventTypesSelected, setEventTypesSelected] = useState(initialFilters.event_types || ['Events']);
    const [experienceSelected, setExperienceSelected] = useState<string[]>(initialFilters.experience_levels || []);
    const [interactivitySelected, setInteractivitySelected] = useState<string[]>(initialFilters.interactivity_levels || []);

    const analyticsProps = useEventAnalyticsProps();

    const filteredTagOptions = filterOptions.tags?.filter(tag =>
        tag.name.toLowerCase().includes(query.toLowerCase()) &&
        !selectedTags.includes(tag.name)
    );

    const toggleItem = (current: string[], setFn: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        if (value === 'All') return setFn(['All']);
        logEvent(UE.FilterTagSelected, {
            ...analyticsProps,
            tag_name: value,
            tag_count: filterOptions.tags?.find(tag => tag.name === value)?.count || 0,
        });
        setFn(prev => {
            const next = prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev.filter(v => v !== 'All'), value];
            return next.length === 0 ? ['All'] : next;
        });
    };

    const toggleEventType = (type: string) => {
        setEventTypesSelected(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
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
                        <TextInput
                            style={styles.searchInput}
                            placeholder={selectedTags.length === 0 ? 'Tags' : ''}
                            value={query}
                            onChangeText={onChangeSearch}
                        />

                        <ScrollView horizontal style={styles.tagsScroll} showsHorizontalScrollIndicator={false}>
                            {selectedTags.map(tag => (
                                <TagPill
                                    key={tag}
                                    label={tag}
                                    onRemove={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                                />
                            ))}
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                            {(query.length > 0 ? filteredTagOptions : filterOptions.tags.filter(tag => !selectedTags.includes(tag.name)))
                                .map(tag => (
                                    <TouchableOpacity
                                        key={tag.name}
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
                                        <TagPill label={`${tag.name} (${tag.count})`} variant="suggestion" />
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>

                        {selectedTags.length > 0 && (
                            <TouchableOpacity onPress={clearTags} style={styles.clearTags}>
                                <Text style={styles.clearText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.sectionLabel}>Event Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {filterOptions.event_types?.map(type => (
                            <Pill
                                key={type.name}
                                label={`${snakeToTitle(type.name)} (${type.count})`}
                                selected={eventTypesSelected.includes(type.name)}
                                onPress={() => toggleEventType(type.name)}
                            />

                        ))}
                    </ScrollView>

                    <Text style={styles.sectionLabel}>Experience</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {filterOptions.experience_levels?.map(({ name, count }) => (
                            <Pill
                                key={name}
                                label={`${snakeToTitle(name)} (${count})`}
                                selected={experienceSelected.includes(name)}
                                onPress={() => toggleItem(experienceSelected, setExperienceSelected, name)}
                            />
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionLabel}>Interactivity</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {filterOptions.interactivity_levels?.map(({ name, count }) => (
                            <Pill
                                key={name}
                                label={`${snakeToTitle(name)} (${count})`}
                                selected={interactivitySelected.includes(name)}
                                onPress={() => toggleItem(interactivitySelected, setInteractivitySelected, name)}
                            />
                        ))}
                    </ScrollView>
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
    searchInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
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
    horizontalScroll: {
        marginBottom: 16,
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
