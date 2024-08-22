import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LinkItem = {
    id: string;
    title: string;
    url: string;
};

const links: LinkItem[] = [
    {
        id: '1', title: 'List of Organizers', url:
            'https://www.notion.so/bcc0be4e78bf47b0a593988fa5a4ec6f?v=ed152f9629a2457bbabb58bbaae42155&pvs=4'
    },
    // Add more links as needed
];

const LinkList: React.FC = () => {
    const handlePress = (url: string) => {
        Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    };

    const renderItem = ({ item }: { item: LinkItem }) => (
        <TouchableOpacity onPress={() => handlePress(item.url)}>
            <Text style={styles.link}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={links}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    link: {
        fontSize: 18,
        color: 'blue',
        marginBottom: 15,
    },
});

export default LinkList;

