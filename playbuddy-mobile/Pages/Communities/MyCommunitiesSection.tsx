import React from "react";
import { StyleSheet, View } from "react-native";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import { CommunitiesList } from "./CommunitiesList";

export const MyCommunitiesSection = ({ type }: { type: 'organizer' | 'private' } = { type: 'private' }) => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const { myCommunities: { myOrganizerPublicCommunities } } = useCommonContext();

    return (
        <View style={styles.container}>
            {type === 'private' && <CommunitiesList title="My Private Communities" communities={privateCommunities} flex={1} entityType="private_community" />}
            {type === 'organizer' && <CommunitiesList title="My Favorite Organizers" communities={myOrganizerPublicCommunities} flex={2} entityType="organizer" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f2f7',
        marginTop: 20,
    }
});