import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Button, ActivityIndicator } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Community, useCommonContext } from '../../Common/CommonContext';
import { useNavigation } from '@react-navigation/native';
import EventCalendarView from '../../Calendar/EventCalendarView';
import { useCalendarContext } from '../../Calendar/CalendarContext';

const MyOrganizersEvents: React.FC = () => {
    const { myCommunities: { myOrganizerPublicCommunities } } = useCommonContext();
    const { filteredEvents } = useCalendarContext();
    const navigation = useNavigation();
    const events = useMemo(() => {
        return filteredEvents.filter(event =>
            event.communities &&
            event.communities.some(eventCommunity =>
                myOrganizerPublicCommunities.some(myOrganizerCommunity =>
                    myOrganizerCommunity.id === eventCommunity.id
                )
            )
        );
    }, [filteredEvents, myOrganizerPublicCommunities]);

    if (events.length > 0) {
        return <EventCalendarView events={events} />;
    } else {
        return (
            <View style={styles.centeredView}>
                <Text>No events from your organizers yet.</Text>
                <Button
                    title="Follow an organizer"
                    onPress={() => navigation.navigate('All Organizers')}
                />
            </View>
        );
    }
};

const MyOrganizers: React.FC = () => {
    const { myCommunities: { myOrganizerPublicCommunities }, leaveCommunity } = useCommonContext();
    const navigation = useNavigation();

    if (myOrganizerPublicCommunities.length > 0) {
        return (
            <FlatList
                data={myOrganizerPublicCommunities}
                renderItem={({ item }) => (
                    <TouchableOpacity>
                        <View style={styles.organizerItem}>
                            <Text style={styles.organizerName}>{item.name}</Text>
                            <TouchableOpacity onPress={() => leaveCommunity.mutate({ community_id: item.id })} style={styles.unfollowButton}>

                                <Text style={styles.buttonText}>Unfollow</Text>

                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
            />
        );
    } else {
        return (
            <View style={styles.centeredView}>
                <Text>You're not following any organizers yet.</Text>
                <Button
                    title="Follow an organizer"
                    onPress={() => navigation.navigate('All Organizers')}
                />
            </View>
        );
    }
};

const AllOrganizers: React.FC = () => {
    const {
        communities: { organizerPublicCommunities },
        myCommunities: { myOrganizerPublicCommunities },
        joinCommunity,
        leaveCommunity,
    } = useCommonContext();

    const [searchQuery, setSearchQuery] = useState('');

    const handleJoin = useCallback((communityId: string) => {
        joinCommunity.mutate({ community_id: communityId, type: 'organizer_public_community' });
    }, [joinCommunity]);

    const handleLeave = useCallback((communityId: string) => {
        leaveCommunity.mutate({ community_id: communityId, type: 'organizer_public_community' });
    }, [leaveCommunity]);

    const filteredOrganizers = organizerPublicCommunities
        .filter(organizer => organizer.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search organizers..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {filteredOrganizers.length > 0 ? (
                    <FlatList
                        data={filteredOrganizers}
                        renderItem={({ item }) => {
                            const isFollowing = myOrganizerPublicCommunities.some(community => community.id === item.id);
                            return (
                                <View style={styles.organizerItem}>
                                    <Text style={styles.organizerName}>{item.name}</Text>
                                    <TouchableOpacity
                                        onPress={() => isFollowing ? handleLeave(item.id) : handleJoin(item.id)}
                                        style={isFollowing ? styles.unfollowButton : styles.followButton}
                                    >

                                        <Text style={styles.buttonText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>

                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                        keyExtractor={(item) => item.id}
                    />
                ) : (
                    <View style={styles.centeredView}>
                        <Text>No organizers found</Text>
                        <Button title="Refresh" onPress={() => { }} />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

// Main tab navigation component
export const Organizers: React.FC = () => {
    const Tab = createMaterialTopTabNavigator();
    return (
        <Tab.Navigator>
            <Tab.Screen name="My Event Feed" component={MyOrganizersEvents} />
            <Tab.Screen name="My Organizers" component={MyOrganizers} />
            <Tab.Screen name="All Organizers" component={AllOrganizers} />
        </Tab.Navigator>
    );
};

// Styling for iOS-like design
const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        flex: 1,
        backgroundColor: '#f2f2f7',
        marginTop: 20,
    },
    content: {
        flex: 1,
        flexDirection: 'column',
    },
    organizerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        marginVertical: 5,
        marginHorizontal: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    organizerName: {
        fontSize: 18,
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    unfollowButton: {
        backgroundColor: '#ff3b30',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center',
    },
    followButton: {
        backgroundColor: '#007aff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    searchInput: {
        height: 40,
        margin: 15,
        marginTop: 0,
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'white',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        fontSize: 16,
    },
});
