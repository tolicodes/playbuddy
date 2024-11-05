import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NavStack } from '../types';
import { AvatarCircle } from '../Auth/AvatarCircle';

interface Buddy {
    user_id: string;
    name: string;
    avatar_url: string | null;
    share_code: string; // Added missing required property
}

interface BuddyAvatarCarouselProps {
    buddies: Buddy[];
}

export const BuddyAvatarCarousel: React.FC<BuddyAvatarCarouselProps> = ({ buddies }) => {
    const navigation = useNavigation<NavStack>();

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {buddies.map((buddy, index) => (
                <TouchableOpacity
                    key={buddy.user_id}
                    onPress={() => navigation.navigate('Buddy Events', { buddyAuthUserId: buddy.user_id })}
                >
                    <View style={styles.avatarContainer}>
                        <AvatarCircle userProfile={buddy} size={25} />
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'visible',
    },
    avatarContainer: {
        position: 'relative',
        overflow: 'visible',
        marginLeft: 3,
    },
});
