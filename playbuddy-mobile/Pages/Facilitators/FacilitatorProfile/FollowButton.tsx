import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../components/styles';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchFollows, useFollow, useUnfollow } from '../../../Common/db-axios/useFollows';
import { logEvent } from '../../../Common/hooks/logger';
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
                    size={fontSizes.base}
                    color={isFollowed ? colors.white : colors.headerPurple}
                    style={{ marginRight: spacing.xsPlus }}
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
        borderColor: colors.white,
    },
    unfollowButtonText: {
        color: colors.white,
    },
    followButton: {
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lgPlus,
        borderWidth: 1,
        marginRight: spacing.xs,
        marginBottom: spacing.sm,
    },
    followButtonText: {
        fontWeight: '600',
        fontSize: fontSizes.base,
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    followButtonActive: {
        backgroundColor: colors.white,
        borderColor: colors.white,
    },
    followText: {
        color: colors.headerPurple,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
