import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Buddy {
    user_id: string;
    name: string;
    avatar_url: string | null;
}

interface BuddyAvatarCarouselProps {
    buddies: Buddy[];
}

export const BuddyAvatarCarousel: React.FC<BuddyAvatarCarouselProps> = ({ buddies }) => {
    const navigation = useNavigation();
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {buddies.map((buddy, index) => {
                return (
                    <TouchableOpacity key={buddy.user_id} onPress={() => navigation.navigate('Buddy Events', { buddyAuthUserId: buddy.user_id })}>
                        <View style={[styles.avatarContainer, index > 0 && styles.overlappingAvatar]}>
                            <Image source={{ uri: buddy.avatar_url || '' }} style={styles.avatar} />
                        </View>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'visible',
        // marginLeft: 20,
        // marginTop: -5
    },
    scrollContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'visible',
    },
    avatarContainer: {
        position: 'relative',
        overflow: 'visible',
    },
    overlappingAvatar: {
        // marginLeft: -15, // Negative margin to overlap avatars
    },
    avatar: {
        width: 25,
        height: 25,
        borderRadius: 15,
        marginLeft: 3,
        // borderWidth: 2,
        // borderColor: '#fff',
        backgroundColor: '#f0f0f0',
    },
    tooltip: {
        position: 'absolute',
        bottom: 0,
        left: -10,
        backgroundColor: '#333',
        padding: 5,
        borderRadius: 5,
        width: 100,
        zIndex: 10000,
    },
    tooltipText: {
        color: '#fff',
        fontSize: 12,
    },
});
