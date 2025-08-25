import React from "react";
import { StyleSheet, View } from "react-native";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import { CommunitiesList } from "./CommunitiesList";

export const MyCommunitiesSection = ({ type, onPressAllCommunities }: { type: 'organizer' | 'private'; onPressAllCommunities?: () => void } = { type: 'private' }) => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const { myCommunities: { myOrganizerPublicCommunities } } = useCommonContext();

    return (
        <View style={styles.container}>
            {type === 'private' && <CommunitiesList
                title="My Private Communities"
                communities={privateCommunities}
                entityType="private_community"
                onPressAllCommunities={onPressAllCommunities}
            />}
            {type === 'organizer' && <CommunitiesList
                title="My Favorite Organizers"
                communities={myOrganizerPublicCommunities}
                entityType="organizer"
                onPressAllCommunities={onPressAllCommunities}
            />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    }
});