import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { HEADER_PURPLE } from '../../../components/styles';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchFollows, useFollow, useUnfollow } from '../../../Common/db-axios/useFollows';

type Props = {
    followeeId: string;
    followeeType: 'facilitator' | 'event' | 'organizer' | 'munch';
};

export const FollowButton = ({ followeeId, followeeType }: Props) => {
    const { authUserId } = useUserContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const { mutate: follow } = useFollow(authUserId || undefined);
    const { mutate: unfollow } = useUnfollow(authUserId || undefined);

    const isFollowed = follows?.[followeeType]?.includes(followeeId);

    const handlePress = () => {
        if (!authUserId) {
            Alert.alert('You must be logged in to follow');
            return;
        }

        if (isFollowed) {
            unfollow({ followee_type: followeeType, followee_id: followeeId });
        } else {
            follow({ followee_type: followeeType, followee_id: followeeId });
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.followButton,
                isFollowed ? styles.unfollowButton : styles.followButtonActive,
            ]}
        >
            <View style={styles.iconRow}>
                <FontAwesome
                    name={isFollowed ? 'heart-o' : 'heart'}
                    size={14}
                    color={isFollowed ? '#fff' : HEADER_PURPLE}
                    style={{ marginRight: 6 }}
                />
                <Text style={[styles.followButtonText, isFollowed ? styles.unfollowText : styles.followText]}>
                    {isFollowed ? 'Unfollow' : 'Follow'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    followButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
        marginRight: 4,
        marginBottom: 8,
    },
    followButtonActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    unfollowButton: {
        backgroundColor: 'transparent',
        borderColor: '#fff',
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    followButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    followText: {
        color: HEADER_PURPLE,
    },
    unfollowText: {
        color: '#fff',
    },
});
