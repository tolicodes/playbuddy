import React, { useState } from "react";
import { Text, TouchableOpacity, FlatList, StyleSheet, View, Button, SafeAreaView, TextInput } from "react-native";
import { Community, useCommonContext } from "../../Common/hooks/CommonContext";
import { useNavigation } from "@react-navigation/native";
import { UseMutationResult } from "@tanstack/react-query";
import { logEvent } from "../../Common/hooks/logger";
import { NavStack } from "../../Common/Nav/NavStackType";
import { useLeaveCommunity } from "../../Common/hooks/useCommunities";
import { UE } from "../../commonTypes";

const CommunityList = ({
    title,
    communities,
    onClickLeave,
    showSearch = false
}: {
    title: string,
    communities: Community[],
    onClickLeave: UseMutationResult<Community, Error, unknown>,
    showSearch?: boolean
}) => {
    const navigation = useNavigation<NavStack>();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCommunities = communities
        .filter(community => community.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (communities.length === 0) {
        return (
            <View style={styles.centeredView}>
                <Text>You&apos;re not following any organizers yet.</Text>
                <Button
                    title="Follow an organizer"
                    onPress={() => {
                        navigation.navigate('Organizers', { screen: 'All Organizers' });
                        logEvent('my_communities_navigate_to_all_organizers');
                    }}
                />
            </View>
        )
    }

    return (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {showSearch && <TextInput
                style={styles.searchInput}
                placeholder="Search communities..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
            />}
            <FlatList
                data={filteredCommunities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.communityItem}
                        onPress={() => {
                            navigation.navigate('Community Events', { communityId: item.id });
                            logEvent(UE.CommunityListNavigateToCommunityEvents, { communityId: item.id });
                        }}
                    >
                        <View style={styles.communityItemContent}>
                            <Text style={styles.communityName}>{item.name}</Text>
                            <TouchableOpacity onPress={() => {
                                onClickLeave.mutate({ community_id: item.id });
                                logEvent('my_communities_unfollow_community', { communityId: item.id });
                            }} style={styles.unfollowButton}>
                                <Text style={styles.buttonText}>Unfollow</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
                style={{ height: 200 }}
            />
        </View>
    )
}

export const CommunitiesList: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const leaveCommunity = useLeaveCommunity();

    const { myCommunities: { myOrganizerPublicCommunities } } = useCommonContext();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <CommunityList title="My Private Communities" communities={privateCommunities} onClickLeave={leaveCommunity} />
                <CommunityList title="My Public Communities" communities={myOrganizerPublicCommunities} onClickLeave={leaveCommunity} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    section: {
        padding: 16,
        paddingVertical: 0
    },
    sectionTitle: {
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
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20
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
    container: {
        flex: 1,
        backgroundColor: '#f2f2f7',
        marginTop: 20,
    },
    content: {
        flex: 1,
        flexDirection: 'column',
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