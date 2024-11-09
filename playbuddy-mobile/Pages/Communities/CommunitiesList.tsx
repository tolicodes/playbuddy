import React, { useState, useCallback } from "react";
import { Text, TouchableOpacity, FlatList, StyleSheet, View, Button, TextInput } from "react-native";
import { Community, useCommonContext } from "../../Common/CommonContext";
import { useNavigation } from "@react-navigation/native";
import { useFetchMyCommunities } from "../../Common/hooks/useCommunities";
import { NavStack } from "../../types";

export const CommunitiesList = ({
    title,
    communities,
    showSearch = false,
    flex = 1,
}: {
    title: string,
    communities: Community[],
    showSearch?: boolean,
    flex?: number,
}) => {
    const navigation = useNavigation<NavStack>();
    const [searchQuery, setSearchQuery] = useState('');
    const { joinCommunity, leaveCommunity } = useCommonContext();
    const { data: myCommunities = [] } = useFetchMyCommunities();

    const handleJoin = useCallback((communityId: string) => {
        joinCommunity.mutate({ community_id: communityId, type: 'organizer_public_community' });
    }, [joinCommunity]);

    const handleLeave = useCallback((communityId: string) => {
        leaveCommunity.mutate({ community_id: communityId });
    }, [leaveCommunity]);

    const filteredCommunities = communities
        .filter(community => community.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (communities.length === 0) {
        return (
            <View style={styles.centeredView}>
                <Text>You're not following any organizers yet.</Text>
                <Button
                    title="Follow an organizer"
                    onPress={() => navigation.navigate('Join Community')}
                />
            </View>
        );
    }

    return (
        <View style={[styles.list, { flex }]}>
            <Text style={styles.listTitle}>{title}</Text>
            {showSearch && (
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            )}
            <FlatList
                data={filteredCommunities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isJoined = myCommunities?.some(community => community.id === item.id);
                    return (
                        <TouchableOpacity
                            style={styles.communityItem}
                            onPress={() => navigation.navigate('Community Events', { communityId: item.id })}
                        >
                            <View style={styles.communityItemContent}>
                                <Text style={styles.communityName}>{item.name}</Text>
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        if (isJoined) {
                                            handleLeave(item.id);
                                        } else {
                                            handleJoin(item.id);
                                        }
                                    }}
                                    style={isJoined ? styles.unfollowButton : styles.followButton}
                                >
                                    <Text style={styles.buttonText}>
                                        {isJoined ? 'Unfollow' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                style={{ height: 200 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    list: {},
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center'
    },
    communityItem: {
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        margin: 16,
        marginTop: 0,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    communityItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    communityName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
        backgroundColor: '#007AFF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center',
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