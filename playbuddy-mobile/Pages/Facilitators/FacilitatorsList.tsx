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
import { LAVENDER_BACKGROUND } from '../../components/styles';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavStack } from '../../Common/Nav/NavStackType';
import { Facilitator } from '../../Common/types/commonTypes';
import { logEvent } from '../../Common/hooks/logger';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';

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
            alert('Create an account to follow a facilitator!');
            return;
        }
        follow({ followee_type: 'facilitator', followee_id: id });
    }, [authUserId, follow]);

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
                    placeholderTextColor="#999"
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
                            style={[
                                styles.item,
                                { backgroundColor: '#fff' }
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                logEvent(UE.FacilitatorListOpenFacilitatorProfile, {
                                    ...analyticsProps,
                                    facilitator_id: item.id
                                });
                                navigation.navigate('Facilitator Profile', { facilitatorId: item.id })
                            }}
                        >
                            <View style={styles.row}>
                                {item.profile_image_url
                                    ? <Image source={{ uri: item.profile_image_url }} style={styles.avatar} />
                                    : <FAIcon name="user-circle" size={40} color="#666" style={styles.avatar} />
                                }

                                <View style={styles.info}>
                                    <View style={styles.nameContainer}>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        {item.verified && (
                                            <MaterialIcons
                                                name="check-circle"
                                                size={18}
                                                color="#1DA1F2"
                                                style={{ marginLeft: 6, alignSelf: 'flex-end' }}
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

                                <TouchableOpacity
                                    onPress={() => {
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
                                    }}
                                    style={styles.heartBtn}
                                >
                                    <FAIcon
                                        name={isFollowing ? 'heart' : 'heart-o'}
                                        size={24}
                                        color={isFollowing ? '#E11D48' : '#666'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LAVENDER_BACKGROUND,
        paddingTop: 12
    },
    searchInput: {
        height: 44,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DDD',
        fontSize: 16,
        color: '#333'
    },
    item: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
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
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12
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
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    tagRow: {
        flexDirection: 'row',
        marginTop: 4,
        flexWrap: 'wrap'
    },
    tag: {
        backgroundColor: '#EAEAFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 4,
        marginTop: 2
    },
    tagText: {
        fontSize: 10,
        color: '#7F3FFF'
    },
    sub: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    heartBtn: {
        padding: 8
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24
    },
    emptyMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center'
    }
});
