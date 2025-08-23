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
import TabBar from '../../../components/TabBar';
import { logEvent } from '../../../Common/hooks/logger';
import { UE } from '../../../userEventTypes';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';

const STATIC_HEADER_HEIGHT = 140;

const TABS = [
    { name: 'Bio', value: 'bio' },
    { name: 'Events', value: 'events' },
    { name: 'Media', value: 'media' },
]

export default function ProfileScreen() {
    const analyticsProps = useAnalyticsProps();

    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const { params } = useRoute<any>();
    const facilitatorId = params?.facilitatorId;
    const navigation = useNavigation<NavStack>();
    const { data: facilitators, isLoading, error } = useFetchFacilitators();
    const { data: events } = useFetchEvents({
        includeFacilitatorOnly: true
    });

    const [activeTab, setActiveTab] = useState<string>('bio');
    const [introVideoAspectRatio, setIntroVideoAspectRatio] = useState<'portrait' | 'landscape'>('landscape');

    const scrollY = useState(new Animated.Value(0))[0];

    const facilitator = facilitators?.find(f => f.id === facilitatorId);
    if (isLoading) return <Text>Loading…</Text>;
    if (error || !facilitator) return <Text>Profile not found</Text>;

    const ownEvents = facilitator.event_ids
        ?.map(id => events?.find(e => e.id === id))
        .filter(Boolean) as Event[];


    const organizerEvents = events?.filter(e => e.organizer.id === facilitator.organizer_id);

    const combinedEvents = Array.from(
        new Set(
            [...ownEvents, ...(organizerEvents || [])].map(event => event.id),
        ),
    ).map(id => events?.find(event => event.id === id)).filter(Boolean) as Event[];

    const headerProps = {
        facilitatorId: facilitator.id,
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

    const tabBar = <TabBar tabs={TABS} active={activeTab} onPress={(value) => {
        setActiveTab(value);
        logEvent(UE.FacilitatorsProfileTabChange, {
            ...analyticsProps,
            tab: value
        });
    }} />

    const header = showAnimatedHeader ? (
        <Animated.View style={[styles.headerContainer, { transform: [{ translateY }] }]}>
            <View style={[styles.videoContainer, { height: INTRO_VIDEO_HEIGHT }]}>
                <IntroVideo
                    url={facilitator.intro_video_url!}
                    name={facilitator.name}
                    onAspectRatio={setIntroVideoAspectRatio}
                    facilitatorId={facilitator.id}
                />
            </View>
            <View style={styles.staticHeaderContent}>
                <ProfileHeader {...headerProps} paddingTop={true} />
                {tabBar}
            </View>
        </Animated.View>
    ) : (
        <View style={styles.staticHeaderContent}>
            <ProfileHeader {...headerProps} />
            {tabBar}
        </View>
    )

    return (
        <View style={styles.container}>
            {activeTab === 'bio' ? header : tabBar}

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
                        <EventsTab events={combinedEvents} facilitator={facilitator} />
                    )}
                    {activeTab === 'media' && <MediaCarousel
                        medias={facilitator.media || []}
                        facilitatorName={facilitator.name}
                        facilitatorId={facilitator.id} />}
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
        backgroundColor: 'transparent',
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
});
