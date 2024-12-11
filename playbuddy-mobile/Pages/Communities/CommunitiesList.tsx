import React, { useState, useCallback } from "react";
import { Text, TouchableOpacity, FlatList, StyleSheet, View, Button, TextInput } from "react-native";
import { Community, useCommonContext } from "../../Common/hooks/CommonContext";
import { useNavigation } from "@react-navigation/native";
import { useFetchMyCommunities, useJoinCommunity, useLeaveCommunity } from "../../Common/hooks/useCommunities";
import { NavStack } from "../../Common/Nav/NavStackType";
import { logEvent } from "../../Common/hooks/logger";

export const CommunitiesList = ({
    title,
    communities,
    showSearch = false,
    flex = 1,
    entityType = 'organizer',
}: {
    title: string,
    communities: Community[],
    showSearch?: boolean,
    flex?: number,
    entityType?: 'private_community' | 'organizer',
}) => {
    const navigation = useNavigation<NavStack>();
    const [searchQuery, setSearchQuery] = useState('');
    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();
    const { data: myCommunities = [] } = useFetchMyCommunities();

    const handleJoin = useCallback((communityId: string) => {
        joinCommunity.mutate({ community_id: communityId, type: 'organizer_public_community' });
        logEvent('community_list_community_joined', { communityId });
    }, [joinCommunity]);

    const handleLeave = useCallback((communityId: string) => {
        leaveCommunity.mutate({ community_id: communityId });
        logEvent('community_list_community_left', { communityId });
    }, [leaveCommunity]);

    const filteredCommunities = communities
        .filter(community => community.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (communities.length === 0) {
        return (
            <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{title}</Text>

                <View style={styles.centeredView}>
                    <Text>You're not following any {entityType === 'private_community' ? 'communities' : 'organizers'} yet.</Text>
                    <Button
                        title={`${entityType === 'private_community' ? 'Join community' : 'Follow organizer'}`}
                        onPress={() => {
                            navigation.navigate('Communities', { screen: 'Join Community' });
                            logEvent('community_list_navigate_to_join_community_button_pressed');
                        }}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.list]}>
            {showSearch && (
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${entityType === 'private_community' ? 'communities' : 'organizers'}...`}
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
                            onPress={() => {
                                navigation.navigate('Communities', { screen: 'Community Events', params: { communityId: item.id } });
                                logEvent('community_list_navigate_to_community_events', { communityId: item.id });
                            }}
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
    list: {
        height: '100%'
    },
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',

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