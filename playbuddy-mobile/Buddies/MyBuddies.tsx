import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBuddiesContext } from './BuddiesContext';
import { useNavigation } from '@react-navigation/native';

const MyBuddies = () => {
    const { buddies } = useBuddiesContext(); // Fetch buddies and loading state.
    const navigation = useNavigation();

    if (buddies.isPending) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const renderBuddy = ({ item }: { item: { avatar_url: string; name: string } }) => {
        return (
            <View style={styles.buddyContainer}>
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                <TouchableOpacity onPress={() => navigation.navigate('Buddy Events', { buddyAuthUserId: item.user_id })}>
                    <Text style={styles.buddyName}>{item.name}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {buddies.data && buddies.data?.length > 0 ? (
                <FlatList
                    data={buddies.data}
                    keyExtractor={(item) => item.user_id}
                    renderItem={renderBuddy}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <Text style={styles.noBuddiesText}>No buddies yet. Add some to your list!</Text>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F9F9FB', // iOS light background color
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1C1C1E', // iOS dark text color
        textAlign: 'center',
        marginBottom: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    buddyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA', // Light gray for iOS-style divider
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    buddyName: {
        fontSize: 18,
        color: '#3A3A3C',
        fontWeight: '500',
    },
    noBuddiesText: {
        fontSize: 18,
        color: '#8E8E93',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default MyBuddies;
