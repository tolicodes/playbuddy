import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, SectionList, StyleSheet, SafeAreaView, Animated, TouchableOpacity, View } from 'react-native';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';

import { Event } from '../../../Common/commonTypes';
import { ListItem } from '../ListItem';
import { SECTION_DATE_FORMAT, useGroupedEvents } from '../hooks/useGroupedEvents';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { EventWithMetadata, useCalendarContext } from '../CalendarContext';
import { NavStack } from '../types';
import { CustomCalendarDay, CustomCalendarDayProps } from './CustomCalendarDay';

const CALENDAR_HEIGHT = 250;

const EventsList: React.FC = () => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const { filters, setFilters, filteredEvents } = useCalendarContext();
    const [searchQuery, setSearchQuery] = useState('');
    const { sections, markedDates } = useGroupedEvents(filteredEvents);
    const sectionListRef = useRef<SectionList<Event>>(null);
    const navigation = useNavigation<NavStack>();
    const animatedHeight = useRef(new Animated.Value(CALENDAR_HEIGHT)).current;  // Persist across renders

    // Track item heights
    const [itemHeights, setItemHeights] = useState<{ [key: string]: number }>({});

    // Handle event selection
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    useEffect(() => {
        if (selectedEvent) {
            navigation.navigate('Event Details', { selectedEvent, origin: 'Calendar' });
        }
    }, [selectedEvent]);

    useEffect(() => {
        setFilters({ ...filters, search: searchQuery });
    }, [searchQuery]);

    // Toggle calendar expansion
    const onPressCalendar = () => {
        Animated.timing(animatedHeight, {
            toValue: isCalendarExpanded ? 0 : CALENDAR_HEIGHT, // Toggle between 0 and the actual content height
            duration: 300,
            useNativeDriver: false, // Height animations cannot use native driver
        }).start();

        setIsCalendarExpanded(!isCalendarExpanded);
    };

    const onPressDay = (day: any) => {
        const date = moment(day.dateString).format(SECTION_DATE_FORMAT);
        const sectionIndex = sections.findIndex(section => section.title === date);

        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                sectionIndex,
                itemIndex: sectionIndex === 0 ? 0 : -1,
                animated: true,
            });
        }
    };

    const onPressOpenFilters = () => {
        navigation.navigate('Filters');
    };

    const hasFilters = !!filters.organizers.length;

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.calendar, { height: animatedHeight }]}>
                <Calendar
                    markedDates={markedDates}
                    onDayPress={onPressDay}
                    dayComponent={(props: CustomCalendarDayProps) => (
                        <CustomCalendarDay
                            {...props}
                        />
                    )}
                    theme={{
                        selectedDayBackgroundColor: 'blue',
                        todayTextColor: 'blue',
                        dotColor: 'blue',
                        arrowColor: 'blue',
                        lineHeight: 10,
                    }}
                />
            </Animated.View>

            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.calendarIcon} onPress={onPressCalendar}>
                    <FAIcon name="calendar" size={30} color={isCalendarExpanded ? "#007AFF" : "#8E8E93"} />
                </TouchableOpacity>
                <TextInput
                    style={styles.searchBox}
                    placeholder="Search..."
                    value={searchQuery}
                    onChangeText={text => setSearchQuery(text)}
                />
                <TouchableOpacity style={styles.filterIcon} onPress={onPressOpenFilters}>
                    <FAIcon name="filter" size={30} color={hasFilters ? "#007AFF" : "#8E8E93"} />
                </TouchableOpacity>
            </View>

            <SectionList
                ref={sectionListRef}
                sections={sections}
                stickySectionHeadersEnabled={true}
                renderItem={({ item: event }: { item: EventWithMetadata }) => {
                    return (
                        <View
                            style={{ height: 100 }}
                        >
                            <ListItem
                                item={event}
                                setSelectedEvent={setSelectedEvent}
                            />
                        </View>
                    )
                }}
                renderSectionHeader={({ section }: any) => (
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                )}
                keyExtractor={(item, i) => item.name + item.id}
                ListEmptyComponent={<Text style={styles.emptyList}>No Results</Text>}
                onScrollToIndexFailed={(e) => {
                    console.log('onScrollToIndexFailed', e);
                }}
                initialNumToRender={200}


            />
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    calendar: {
        width: '100%',
        overflow: 'hidden',
    },
    emptyList: {
        padding: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        paddingVertical: 8,
        paddingHorizontal: 20,
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 20,
        paddingBottom: 0,
        backgroundColor: 'white',
    },
    searchBox: {
        height: 40,
        flex: 1,
        borderColor: '#DDD',
        borderWidth: 1,
        paddingHorizontal: 10,
        marginBottom: 20,
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    filterIcon: {
        marginTop: -20,
        marginLeft: 10,
        alignSelf: 'center',
    },
    calendarIcon: {
        marginTop: -20,
        marginRight: 10,
        alignSelf: 'center',
    },
});

export default EventsList;
