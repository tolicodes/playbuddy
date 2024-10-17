import React, { useState } from 'react';
import { View, Image, ScrollView, TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { Tooltip } from '@rneui/themed';



interface Buddy {
    user_id: string;
    name: string;
    avatar_url: string | null;
}

interface BuddyAvatarCarouselProps {
    buddies: Buddy[];
}

export const BuddyAvatarCarousel: React.FC<BuddyAvatarCarouselProps> = ({ buddies }) => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {buddies.map((buddy, index) => {
                const [tooltipVisible, setTooltipVisible] = useState(false);
                return (
                    <TouchableOpacity key={buddy.user_id} onPress={() => setTooltipVisible(!tooltipVisible)}>
                        <Tooltip
                            visible={tooltipVisible}
                            onOpen={() => setTooltipVisible(true)}
                            onClose={() => setTooltipVisible(false)}
                            popover={<Text style={styles.tooltipText}>{buddy.name}</Text>}
                        />
                        <View style={[styles.avatarContainer, index > 0 && styles.overlappingAvatar]}>
                            <Image source={{ uri: buddy.avatar_url || '' }} style={styles.avatar} />

                        </View>


                    </TouchableOpacity>
                )
            })}
        </ScrollView >
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
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#fff',
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
