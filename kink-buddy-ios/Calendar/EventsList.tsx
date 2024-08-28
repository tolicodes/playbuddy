import React, { useEffect, useRef, useState } from 'react';
import { Text, SectionList, StyleSheet, SafeAreaView } from 'react-native';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Event } from '../commmonTypes';
import { ListItem } from './ListItem';
import { useFetchEvents } from './hooks/useFetchEvents';
import { useGroupedEvents } from './hooks/useGroupedEvents';

type RootStackParamList = {
    'Event List': undefined;
    'Event Details': { selectedEvent: Event };
    Filters: undefined;
};

const EventsList: React.FC = () => {
    const { filteredEvents } = useFetchEvents();

    const { sections, markedDates } = useGroupedEvents(filteredEvents);

    const sectionListRef = useRef<SectionList<Event>>(null);
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    // Navigate to Event Details screen when selectedEvent changes
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    useEffect(() => {
        if (!selectedEvent) return
        navigation.navigate('Event Details', { selectedEvent })
    }, [selectedEvent])

    const handleDayPress = (day: any) => {
        const date = moment(day.dateString).format('MMM D, YYYY');
        const sectionIndex = sections.findIndex(section => section.title === date);

        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                sectionIndex,
                itemIndex: sectionIndex === 0 ? 0 : -1,
                animated: true,
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Calendar
                markedDates={markedDates}
                onDayPress={handleDayPress}
                style={styles.calendar}
                theme={{
                    selectedDayBackgroundColor: 'blue',
                    todayTextColor: 'blue',
                    dotColor: 'blue',
                    arrowColor: 'blue',
                    'stylesheet.day.basic': {
                        base: {
                            margin: .2,
                        },
                    }
                }}
            />

            <SectionList
                ref={sectionListRef}
                sections={sections}
                stickySectionHeadersEnabled={true}
                renderItem={({ item }: { item: Event }) => <ListItem item={item} setSelectedEvent={setSelectedEvent} />}
                renderSectionHeader={({ section }: any) => <Text style={styles.sectionHeader}>{section.title}</Text>}
                keyExtractor={(item, i) => item.name + item.id}
                onScrollToIndexFailed={() => { console.log('scroll fail') }}
                ListEmptyComponent={<Text>Loading</Text>}
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
        marginBottom: 10,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        paddingVertical: 8,
        paddingHorizontal: 20,
        color: '#333',
    },
});

export default EventsList;
