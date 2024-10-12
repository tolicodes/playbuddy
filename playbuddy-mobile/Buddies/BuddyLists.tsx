import React from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { Avatar } from 'react-native-paper';

const BuddyLists = () => {
    const buddyLists = [
        {
            id: 1,
            name: 'Main List',
            members: [{ id: 1, name: 'John Doe', avatar: 'https://i.pravatar.cc/150?img=1' }],
        },
        {
            id: 2,
            name: 'Close Friends',
            members: [{ id: 2, name: 'Jane Doe', avatar: 'https://i.pravatar.cc/150?img=2' }],
        },
    ];

    return (
        <View>
            {buddyLists.map((list) => (
                <View key={list.id} style={styles.listContainer}>
                    <Text style={styles.listName}>{list.name}</Text>
                    <FlatList
                        data={list.members}
                        renderItem={({ item }) => (
                            <View style={styles.memberContainer}>
                                <Avatar.Image size={50} source={{ uri: item.avatar }} />
                                <Text style={styles.memberText}>{item.name}</Text>
                            </View>
                        )}
                        keyExtractor={(item) => item.id.toString()}
                    />
                </View>
            ))}
            <Button title="New Buddy List" onPress={() => { }} />
        </View>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        marginVertical: 20,
    },
    listName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    memberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
    },
    memberText: {
        marginLeft: 10,
        fontSize: 16,
    },
});

export default BuddyLists;
