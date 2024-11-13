import React from "react";
import { StyleSheet, View } from "react-native";
import { useCommonContext } from "../../Common/CommonContext";
import { CommunitiesList } from "./CommunitiesList";

export const MyCommunitiesSection: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const { myCommunities: { myOrganizerPublicCommunities } } = useCommonContext();

    return (
        <View style={styles.container}>
            <CommunitiesList title="My Private Communities" communities={privateCommunities} flex={1} />
            <CommunitiesList title="My Public Communities" communities={myOrganizerPublicCommunities} flex={2} />
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