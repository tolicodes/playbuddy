import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { HEADER_PURPLE } from '../../../components/styles';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchFollows, useFollow, useUnfollow } from '../../../Common/db-axios/useFollows';
import { logEvent } from '@amplitude/analytics-react-native';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { UE } from '../../../userEventTypes';

type Props = {
    followeeId: string;
    followeeType: 'facilitator' | 'event' | 'organizer' | 'munch';
};

export const FollowButton = ({ followeeId, followeeType }: Props) => {
    const { authUserId } = useUserContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const { mutate: follow } = useFollow(authUserId || undefined);
    const { mutate: unfollow } = useUnfollow(authUserId || undefined);
    const analyticsProps = useAnalyticsProps();

    const isFollowed = follows?.[followeeType]?.includes(followeeId);

    const handlePress = () => {
        if (!authUserId) {
            Alert.alert('You must be logged in to follow');
            return;
        }

        if (isFollowed) {
            logEvent(UE.FacilitatorsProfileUnfollowPressed, {
                ...analyticsProps,
                facilitator_id: followeeId,
            });
            unfollow({ followee_type: followeeType, followee_id: followeeId });
        } else {
            logEvent(UE.FacilitatorsProfileFollowPressed, {
                ...analyticsProps,
                facilitator_id: followeeId,
            });
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
                    name={isFollowed ? 'heart' : 'heart-o'}
                    size={14}
                    color={isFollowed ? '#fff' : HEADER_PURPLE}
                    style={{ marginRight: 6 }}
                />
                <Text style={[styles.followButtonText, isFollowed ? styles.unfollowButtonText : styles.followText]}>
                    {isFollowed ? 'Following' : 'Follow'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    unfollowButton: {
        backgroundColor: 'transparent',
        borderColor: '#fff',
    },
    unfollowButtonText: {
        color: '#fff',
    },
    followButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
        marginRight: 4,
        marginBottom: 8,
    },
    followButtonText: {
        fontWeight: '600',
        fontSize: 14,
        color: '#fff'
    },
    followButtonActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    followText: {
        color: HEADER_PURPLE,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
