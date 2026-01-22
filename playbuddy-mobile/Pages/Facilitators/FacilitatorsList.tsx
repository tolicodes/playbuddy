// components/FacilitatorsList.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useFetchFollows, useFollow, useUnfollow } from '../../Common/db-axios/useFollows';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavStack } from '../../Common/Nav/NavStackType';
import { Facilitator } from '../../Common/types/commonTypes';
import { logEvent } from '../../Common/hooks/logger';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { WishlistHeart } from '../Calendar/ListView/WishlistHeart';
import { useGuestSaveModal } from '../GuestSaveModal';
import { colors, fontFamilies, fontSizes, radius, spacing, sizes } from '../../components/styles';

const ADMIN_EMAIL = 'toli@toli.me';

export const FacilitatorsList = ({
    showSearch = true,
    facilitators
}: {
    showSearch?: boolean;
    facilitators: Facilitator[];
}) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId, userProfile } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const { data: events } = useFetchEvents({
        includeFacilitatorOnly: true
    });

    const analyticsProps = useAnalyticsProps();

    const [searchQuery, setSearchQuery] = useState('');
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const { mutate: follow } = useFollow(authUserId || undefined);
    const { mutate: unfollow } = useUnfollow(authUserId || undefined);

    const isAdmin = userProfile?.email === ADMIN_EMAIL;

    const handleFollow = useCallback((id: string) => {
        if (!authUserId) {
            showGuestSaveModal({
                title: 'Create an account to follow facilitators',
                message: 'Follow facilitators and get new workshop updates.',
                iconName: 'user-plus',
            });
            return;
        }
        follow({ followee_type: 'facilitator', followee_id: id });
    }, [authUserId, follow, showGuestSaveModal]);

    const handleUnfollow = useCallback((id: string) => {
        unfollow({ followee_type: 'facilitator', followee_id: id });
    }, [unfollow]);

    const filtered = useMemo(() => {
        return facilitators
            .filter(f =>
                f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [facilitators, searchQuery]);

    const verifiedOnly = useMemo(() => {
        if (isAdmin) return filtered;
        return filtered.filter(f => f.verified);
    }, [filtered, isAdmin]);

    const fullFacilitators = verifiedOnly.map(f => {
        const organizerEvents = events?.filter(e => e.organizer.id === f.organizer_id) || [];
        const ownEvents = f.event_ids?.map(e => events?.find(ev => ev.id === e)) || [];
        return {
            ...f,
            events: [...organizerEvents, ...ownEvents].filter(Boolean)
        }
    })


    if (fullFacilitators.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyMessage}>
                    No facilitators found.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {showSearch && (
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search facilitators..."
                    placeholderTextColor={colors.textSubtle}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                />
            )}

            <FlatList
                data={fullFacilitators}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                    const isFollowing = follows?.facilitator?.some(f => f === item.id);
                    const upcomingCount = item.events.filter(e =>
                        e && new Date(e.start_date) > new Date()
                    ).length;

                    return (
                        <TouchableOpacity
                            style={styles.item}
                            activeOpacity={0.8}
                            onPress={() => {
                                logEvent(UE.FacilitatorListOpenFacilitatorProfile, {
                                    ...analyticsProps,
                                    facilitator_id: item.id
                                });
                                navigation.navigate('Facilitator Profile', {
                                    facilitatorId: item.id,
                                    title: item.name
                                })
                            }}
                        >
                            <View style={styles.row}>
                                {item.profile_image_url
                                    ? <Image source={{ uri: item.profile_image_url }} style={styles.avatar} />
                                    : <FAIcon name="user-circle" size={sizes.avatarSm} color={colors.textMuted} style={styles.avatar} />
                                }

                                <View style={styles.info}>
                                    <View style={styles.nameContainer}>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        {item.verified && (
                                            <MaterialIcons
                                                name="check-circle"
                                                size={fontSizes.xxl}
                                                color={colors.accentSkyDeep}
                                                style={{ marginLeft: spacing.xsPlus, alignSelf: 'flex-end' }}
                                            />
                                        )}
                                    </View>

                                    <View style={styles.tagRow}>
                                        {item.tags?.map(t => (
                                            <View key={t.id} style={styles.tag}>
                                                <Text style={styles.tagText}>{t.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={styles.sub}>
                                        {upcomingCount} upcoming event{upcomingCount !== 1 ? 's' : ''}
                                    </Text>
                                </View>

                                <WishlistHeart itemIsOnWishlist={isFollowing || false} handleToggleEventWishlist={() => {
                                    if (isFollowing) {
                                        logEvent(UE.FacilitatorListUnfollowFacilitator, {
                                            ...analyticsProps,
                                            facilitator_id: item.id
                                        });
                                        handleUnfollow(item.id)
                                    } else {
                                        logEvent(UE.FacilitatorListFollowFacilitator, {
                                            ...analyticsProps,
                                            facilitator_id: item.id
                                        });
                                        handleFollow(item.id)
                                    }
                                }} />
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: spacing.md
    },
    searchInput: {
        height: sizes.controlHeight,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.smPlus,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderMuted,
        fontSize: fontSizes.xl,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body
    },
    item: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: radius.md,
        padding: spacing.md,
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 1
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: sizes.avatarSm,
        height: sizes.avatarSm,
        borderRadius: radius.sm,
        marginRight: spacing.md
    },
    info: {
        flex: 1,
        justifyContent: 'center'
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    name: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    tagRow: {
        flexDirection: 'row',
        marginTop: spacing.xs,
        flexWrap: 'wrap'
    },
    tag: {
        backgroundColor: colors.surfaceLavenderStrong,
        paddingHorizontal: spacing.xsPlus,
        paddingVertical: spacing.xxs,
        borderRadius: radius.xs,
        marginRight: spacing.xs,
        marginTop: spacing.xxs
    },
    tagText: {
        fontSize: fontSizes.xxs,
        color: colors.headerPurple,
        fontFamily: fontFamilies.body,
    },
    sub: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    heartBtn: {
        padding: 8
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xxl
    },
    emptyMessage: {
        fontSize: fontSizes.xl,
        color: colors.textMuted,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    }
});
