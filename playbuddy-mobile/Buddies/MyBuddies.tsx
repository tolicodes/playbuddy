import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Buddy, useBuddiesContext } from './BuddiesContext';
import { useNavigation } from '@react-navigation/native';
import { getSmallAvatarUrl } from '../Common/imageUtils';
import { NavStack } from '../types';

const MyBuddies = () => {
    const { buddies } = useBuddiesContext(); // Fetch buddies and loading state.
    const navigation = useNavigation<NavStack>();

    if (buddies.isPending) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }


    const Buddy = ({ item }: { item: Buddy }) => {

        const avatarUrl = item.avatar_url && getSmallAvatarUrl(item.avatar_url);
        return (
            <TouchableOpacity onPress={() => navigation.navigate('Buddy Events', { buddyAuthUserId: item.user_id })}>
                <View style={styles.buddyContainer}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    <Text style={styles.buddyName}>{item.name}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {buddies.data && buddies.data?.length > 0 ? (
                <FlatList
                    data={buddies.data}
                    keyExtractor={(item) => item.user_id}
                    renderItem={Buddy}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <Text style={styles.noBuddiesText}>No buddies yet. Add some to your list!</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
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
