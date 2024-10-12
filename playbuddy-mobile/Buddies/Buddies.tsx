import React, { useState } from 'react';
import { View, Text, FlatList, Modal, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from 'react-native-paper';

const Buddies = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [buddyLists] = useState(['Main List', 'Close Friends']);
    const [buddies] = useState([
        { id: 1, name: 'John Doe', avatar: 'https://i.pravatar.cc/150?img=1' },
        { id: 2, name: 'Jane Doe', avatar: 'https://i.pravatar.cc/150?img=2' },
    ]);

    const handleAddToList = () => {
        setIsModalVisible(true);
    };

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={buddies}
                renderItem={({ item }) => (
                    <View style={styles.buddyContainer}>
                        <Avatar.Image size={50} source={{ uri: item.avatar }} />
                        <Text style={styles.buddyText}>{item.name}</Text>
                        <TouchableOpacity onPress={handleAddToList}>
                            <Text style={styles.addButton}>+</Text>
                        </TouchableOpacity>
                    </View>
                )}
                keyExtractor={(item) => item.id.toString()}
            />

            {/* Modal for adding to buddy list */}
            <Modal visible={isModalVisible} animationType="slide">
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add to Buddy List</Text>
                    {buddyLists.map((list, index) => (
                        <Text key={index} style={styles.modalItem}>
                            {list}
                        </Text>
                    ))}
                    <Button title="New Buddy List" onPress={() => { }} />
                    <Button title="Close" onPress={() => setIsModalVisible(false)} />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    buddyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    buddyText: {
        fontSize: 18,
        marginLeft: 10,
        flex: 1,
    },
    addButton: {
        fontSize: 24,
        color: 'blue',
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalTitle: {
        fontSize: 24,
        marginBottom: 20,
    },
    modalItem: {
        fontSize: 18,
        marginBottom: 10,
    },
});

export default Buddies;
