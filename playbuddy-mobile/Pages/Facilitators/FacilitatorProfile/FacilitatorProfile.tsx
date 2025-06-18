import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFetchFacilitators } from '../../../Common/db-axios/useFacilitators';
import { useFetchEvents } from '../../../Common/db-axios/useEvents';
import { NavStack } from '../../../Common/Nav/NavStackType';
import { MediaCarousel } from '../../../components/MediaCarousel';
import type { Event } from '../../../Common/types/commonTypes';
import { EventsTab } from './EventsTab';
import { BioTab } from './BioTab';
import { ProfileHeader } from './ProfileHeader';
import { IntroVideo } from './IntroVideo';

const STATIC_HEADER_HEIGHT = 140;

const TabBar = ({
    active,
    onPress,
}: {
    active: 'bio' | 'events' | 'media';
    onPress: (tab: 'bio' | 'events' | 'media') => void;
}) => (
    <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
            {(['bio', 'events', 'media'] as const).map(key => (
                <TouchableOpacity
                    key={key}
                    style={[styles.tabButton, active === key && styles.activeTab]}
                    onPress={() => onPress(key)}
                >
                    <Text style={active === key ? styles.activeTabText : styles.tabText}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

export default function ProfileScreen() {
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const { params } = useRoute<any>();
    const facilitatorId = params?.facilitatorId;
    const navigation = useNavigation<NavStack>();
    const { data: facilitators, isLoading, error } = useFetchFacilitators();
    const { data: events } = useFetchEvents();
    const [activeTab, setActiveTab] = useState<'bio' | 'events' | 'media'>('bio');
    const [introVideoAspectRatio, setIntroVideoAspectRatio] = useState<'portrait' | 'landscape'>('landscape');

    const scrollY = useState(new Animated.Value(0))[0];

    const facilitator = facilitators?.find(f => f.id === facilitatorId);
    if (isLoading) return <Text>Loading…</Text>;
    if (error || !facilitator) return <Text>Profile not found</Text>;

    const ownEvents = facilitator.event_ids
        ?.map(id => events?.find(e => e.id === id))
        .filter(Boolean) as Event[];

    const headerProps = {
        photoUrl: facilitator.profile_image_url,
        name: facilitator.name,
        verified: facilitator.verified,
        title: facilitator.title,
        instagram: facilitator.instagram_handle,
        fetlife: facilitator.fetlife_handle,
        website: facilitator.website,
        email: facilitator.email,
    };

    const hasIntroVideo = !!facilitator.intro_video_url;
    const showAnimatedHeader = activeTab === 'bio' && hasIntroVideo;

    const INTRO_VIDEO_HEIGHT = introVideoAspectRatio === 'portrait' ? (
        // leave a little sliver of bio
        SCREEN_HEIGHT - STATIC_HEADER_HEIGHT - 300
    ) : (
        300
    );

    const translateY = scrollY.interpolate({
        inputRange: [0, INTRO_VIDEO_HEIGHT],
        outputRange: [0, -INTRO_VIDEO_HEIGHT],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {showAnimatedHeader ? (
                <Animated.View style={[styles.headerContainer, { transform: [{ translateY }] }]}>
                    <View style={[styles.videoContainer, { height: INTRO_VIDEO_HEIGHT }]}>
                        <IntroVideo
                            url={facilitator.intro_video_url!}
                            name={facilitator.name}
                            onAspectRatio={setIntroVideoAspectRatio}
                        />
                    </View>
                    <View style={styles.staticHeaderContent}>
                        <ProfileHeader {...headerProps} />
                        <TabBar active={activeTab} onPress={setActiveTab} />
                    </View>
                </Animated.View>
            ) : (
                <View style={styles.staticHeaderContent}>
                    <ProfileHeader {...headerProps} />
                    <TabBar active={activeTab} onPress={setActiveTab} />
                </View>
            )}

            {activeTab === 'bio' ? (
                <Animated.ScrollView
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    contentContainerStyle={{
                        paddingTop: showAnimatedHeader ? INTRO_VIDEO_HEIGHT + STATIC_HEADER_HEIGHT : 0,
                    }}
                >
                    <BioTab bio={facilitator.bio || ''} facilitator={facilitator} />
                </Animated.ScrollView>
            ) : (
                <View style={styles.bottom}>
                    {activeTab === 'events' && (
                        <EventsTab events={ownEvents} navigation={navigation} facilitator={facilitator} />
                    )}
                    {activeTab === 'media' && <MediaCarousel medias={facilitator.media || []} facilitatorName={facilitator.name} />}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    scroll: { flex: 1 },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    staticHeaderContent: {
        backgroundColor: '#fff',
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
        paddingBottom: 8,
    },
    videoContainer: {
        backgroundColor: '#000',
    },
    bottom: {
        flex: 1,
    },
    tabContainer: {
        backgroundColor: '#6e48aa',
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 5,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    tabButton: { paddingVertical: 8 },
    tabText: { color: '#888' },
    activeTab: { borderBottomWidth: 3 },
    activeTabText: { color: '#888', fontWeight: '600' },
});
