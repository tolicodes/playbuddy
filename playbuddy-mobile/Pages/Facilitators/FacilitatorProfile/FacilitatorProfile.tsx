// FacilitatorProfile.tsx
import React, { useState, useLayoutEffect } from 'react';
import {
    View,
    Text,
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

import { logEvent } from '../../../Common/hooks/logger';
import { UE } from '../../../userEventTypes';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import TabBar from '../../../components/TabBar';

type Tab = { name: string; value: 'bio' | 'events' | 'media' };
const TABS: Tab[] = [
    { name: 'Bio', value: 'bio' },
    { name: 'Events', value: 'events' },
    { name: 'Media', value: 'media' },
];

export default function FacilitatorProfile() {
    const analyticsProps = useAnalyticsProps();
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');

    const { params } = useRoute<any>();
    const facilitatorId = params?.facilitatorId;
    const navigation = useNavigation<NavStack>();

    const { data: facilitators, isLoading, error } = useFetchFacilitators();
    const { data: events } = useFetchEvents({ includeFacilitatorOnly: true });

    const [activeTab, setActiveTab] = useState<Tab['value']>('bio');
    const [introVideoAspectRatio, setIntroVideoAspectRatio] =
        useState<'portrait' | 'landscape'>('landscape');

    const facilitator = facilitators?.find((f) => f.id === facilitatorId);

    useLayoutEffect(() => {
        if (facilitator?.name) {
            navigation.setOptions({ title: facilitator.name });
        }
    }, [navigation, facilitator?.name]);

    if (isLoading) return <Text>Loading…</Text>;
    if (error || !facilitator) return <Text>Profile not found</Text>;

    const ownEvents = facilitator.event_ids
        ?.map((id) => events?.find((e) => e.id === id))
        .filter(Boolean) as Event[];

    const organizerEvents = events?.filter(
        (e) => e.organizer.id === facilitator.organizer_id
    );

    const combinedEvents = Array.from(
        new Set([...ownEvents, ...(organizerEvents || [])].map((e) => e.id))
    )
        .map((id) => events?.find((e) => e.id === id))
        .filter(Boolean) as Event[];

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
    const INTRO_VIDEO_HEIGHT =
        introVideoAspectRatio === 'portrait'
            ? Math.max(220, SCREEN_HEIGHT * 0.42)
            : 300;

    const TabBarEl = (
        // NOTE: no background color changes here — stays transparent to preserve your gradient
        <View style={styles.stickyHeader} collapsable={false}>
            <TabBar
                tabs={TABS}
                active={activeTab}
                onPress={(value) => {
                    setActiveTab(value as Tab['value']);
                    logEvent(UE.FacilitatorsProfileTabChange, { ...analyticsProps, tab: value });
                }}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            {activeTab === 'bio' ? (
                <ScrollView
                    style={styles.bioScroll}
                    contentContainerStyle={styles.bioScrollContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    stickyHeaderIndices={[hasIntroVideo ? 2 : 1]} // 0: video, 1: header, 2: tabbar
                >
                    {hasIntroVideo && (
                        <View style={[styles.videoContainer, { height: INTRO_VIDEO_HEIGHT }]}>
                            <IntroVideo
                                url={facilitator.intro_video_url!}
                                name={facilitator.name}
                                onAspectRatio={setIntroVideoAspectRatio}
                                facilitatorId={facilitator.id}
                            />
                        </View>
                    )}

                    <ProfileHeader {...headerProps} />

                    {TabBarEl}

                    <BioTab bio={facilitator.bio || ''} facilitator={facilitator} />
                </ScrollView>
            ) : (
                <>
                    {TabBarEl}
                    {activeTab === 'events' && (
                        <EventsTab events={combinedEvents} facilitator={facilitator} />
                    )}
                    {activeTab === 'media' && (
                        <MediaCarousel
                            medias={facilitator.media || []}
                            facilitatorName={facilitator.name}
                            facilitatorId={facilitator.id}
                        />
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Bio tab scroll container
    bioScroll: { flex: 1, backgroundColor: 'transparent' },
    bioScrollContent: { flex: 1 },

    videoContainer: { backgroundColor: '#000' },

    // Sticky wrapper for TabBar — transparent to keep your gradient/background
    stickyHeader: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        zIndex: 2,
        backgroundColor: 'transparent',
    },

    // Events/Media body (non-scroll branch)
    sectionOther: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
