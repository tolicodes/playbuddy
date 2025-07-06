import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import TabBar from '../../components/TabBar';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useFetchFollows, useFollow, useUnfollow } from '../../Common/db-axios/useFollows';
import { useFetchFacilitators } from '../../Common/db-axios/useFacilitators';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { FacilitatorsList } from './FacilitatorsList'; // You’ll need to extract your FlatList item rendering here

type TabKey = 'my' | 'all';

export const Facilitators = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('all');

    const { authUserId } = useUserContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const { data: facilitators = [] } = useFetchFacilitators();
    const { data: events = [] } = useFetchEvents({ includeFacilitatorOnly: true });

    const followedIds = new Set(follows?.facilitator || []);

    const fullFacilitators = useMemo(() => {
        return facilitators.map(f => {
            const organizerEvents = events.filter(e => e.organizer.id === f.organizer_id);
            const ownEvents = f.event_ids?.map(id => events.find(e => e.id === id)).filter(Boolean) || [];
            return {
                ...f,
                events: [...organizerEvents, ...ownEvents],
            };
        });
    }, [facilitators, events]);

    const myFacilitators = fullFacilitators.filter(f => followedIds.has(f.id));

    // once myFacilitators is loaded, set the initial tab
    const initialTabSet = useRef(false);

    useEffect(() => {
        if (initialTabSet.current) return;
        myFacilitators.length > 0 ? setActiveTab('my') : setActiveTab('all');
        initialTabSet.current = true;
    }, [myFacilitators]);

    const tabs = [
        { name: 'My Facilitators', value: 'my' },
        { name: 'All Facilitators', value: 'all' },
    ];

    const visibleFacilitators = activeTab === 'my' ? myFacilitators : fullFacilitators;

    return (
        <View style={styles.container}>
            <TabBar tabs={tabs} active={activeTab} onPress={(value) => setActiveTab(value as TabKey)} />

            {visibleFacilitators.length === 0 ? (
                <Text style={styles.emptyMessage}>
                    {activeTab === 'my'
                        ? 'You haven’t followed any facilitators yet.'
                        : 'No facilitators found.'}
                </Text>
            ) : (
                <FacilitatorsList
                    facilitators={visibleFacilitators}
                    showSearch={true}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F6FF',
        paddingTop: 12,
    },
    emptyMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        padding: 32,
    },
});
