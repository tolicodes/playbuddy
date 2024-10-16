import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    TextInput
} from 'react-native';
import { Community, useCommonContext } from '../../Common/CommonContext';
import DemoBanner from '../../Common/DemoBanner';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native-paper';


export const Organizers: React.FC = () => {
    const {
        communities: { organizerPublicCommunities },
        myCommunities: { myOrganizerPublicCommunities },
        joinCommunity,
        leaveCommunity
    } = useCommonContext();

    const navigation = useNavigation();

    const [searchQuery, setSearchQuery] = useState('');

    const handleLeave = useCallback((communityId: string) => {
        leaveCommunity.mutate({ community_id: communityId });
    }, [leaveCommunity]);

    const handleJoin = useCallback((communityId: string) => {
        joinCommunity.mutate({ community_id: communityId });
    }, [joinCommunity]);

    const renderFavoriteOrganizer = ({ item }: { item: Community }) => {
        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('Organizer Events', { communityId: item.id })}
            >
                <View style={styles.organizerItem}>
                    <Text style={styles.organizerName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleLeave(item.id)} style={styles.unfollowButton}>
                        {leaveCommunity.isPending ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Unfollow</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        )
    }

    const renderAllOrganizer = ({ item }: { item: Community }) => {
        const isFollowing = myOrganizerPublicCommunities.some(community => community.id === item.id);
        return (
            <View style={styles.organizerItem}>
                <Text style={styles.organizerName}>{item.name}</Text>
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        if (isFollowing) {
                            handleLeave(item.id);
                        } else {
                            handleJoin(item.id);
                        }
                    }}
                    style={isFollowing ? styles.unfollowButton : styles.followButton}
                >
                    {joinCommunity.isPending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text style={styles.buttonText}>{
                            isFollowing ? 'Unfollow' : 'Follow'
                        }</Text>
                    )}
                </TouchableOpacity>
            </View >
        );
    }

    const organizersSortedByName = [...organizerPublicCommunities]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(organizer => organizer.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.section, styles.myFavoriteOrganizersSection]}>
                    <Text style={styles.sectionTitle}>My Favorite Organizers</Text>
                    <FlatList
                        data={myOrganizerPublicCommunities}
                        renderItem={renderFavoriteOrganizer}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={<Text>No favorite organizers</Text>}
                    />
                </View>
                <View style={[styles.section, styles.allOrganizersSection]}>
                    <Text style={styles.sectionTitle}>All Organizers</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search organizers..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                    />
                    <FlatList
                        data={organizersSortedByName}
                        renderItem={renderAllOrganizer}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={<Text>No organizers found</Text>}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

// Styling for iOS-like design
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f2f7', // iOS light gray background
    },
    content: {
        flex: 1,
        flexDirection: 'column',
    },
    section: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    sectionTitle: {
        fontSize: 20,
        textAlign: 'center',
        fontWeight: 'bold',
        marginHorizontal: 15,
        marginVertical: 10,
        color: '#000', // Dark text color
    },
    myFavoriteOrganizersSection: {
        flex: 3
    },
    allOrganizersSection: {
        flex: 5
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
        elevation: 2, // Shadow for Android
    },
    organizerName: {
        fontSize: 18,
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    unfollowButton: {
        backgroundColor: '#ff3b30', // iOS red color
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center',
    },
    followButton: {
        backgroundColor: '#007aff', // iOS blue color
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
