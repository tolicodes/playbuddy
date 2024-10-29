import React from "react";
import { Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useCommonContext } from "../../Common/CommonContext";
import { useNavigation } from "@react-navigation/native";

export const CommunitiesList: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const navigator = useNavigation();

    return (
        <>
            <Text style={styles.sectionTitle}>My Communities</Text>
            {privateCommunities.length > 0 ? (
                <FlatList
                    data={privateCommunities}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.communityItem}
                            onPress={() => navigator.navigate('Community Events', { communityId: item.id })}
                        >
                            <Text style={styles.communityName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    style={{ height: 200 }}
                />
            ) : (
                <Text style={styles.emptyText}>You haven&apos;t joined any communities yet.</Text>
            )}
        </>
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
        elevation: 2
    },
    communityName: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20
    }
});