import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from 'react-native-paper';
import Tooltip from 'react-native-walkthrough-tooltip';

const SharedEvents = () => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipData, setTooltipData] = useState('');

    const events = [
        { id: 1, name: 'Event 1' },
        { id: 2, name: 'Event 2' },
    ];

    const avatars = [
        { id: 1, name: 'John Doe', avatar: 'https://i.pravatar.cc/150?img=1' },
        { id: 2, name: 'Jane Doe', avatar: 'https://i.pravatar.cc/150?img=2' },
    ];

    return (
        <View>
            <FlatList
                data={events}
                renderItem={({ item }) => (
                    <View style={styles.eventContainer}>
                        <Text style={styles.eventText}>{item.name}</Text>
                        <View style={styles.avatarContainer}>
                            {avatars.map((person) => (
                                <TouchableOpacity
                                    key={person.id}
                                    onPress={() => {
                                        setTooltipData(person.name);
                                        setShowTooltip(true);
                                    }}
                                >
                                    <Tooltip isVisible={showTooltip} content={<Text>{tooltipData}</Text>} placement="bottom">
                                        <Avatar.Image size={50} source={{ uri: person.avatar }} />
                                    </Tooltip>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                keyExtractor={(item) => item.id.toString()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    eventContainer: {
        marginVertical: 10,
    },
    eventText: {
        fontSize: 18,
        marginBottom: 10,
    },
    avatarContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export default SharedEvents;
