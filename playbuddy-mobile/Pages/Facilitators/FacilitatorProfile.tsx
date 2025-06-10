import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Linking,
    Alert,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Markdown from 'react-native-markdown-display';
import { useRoute } from '@react-navigation/native';
import { useFetchFacilitators } from '../../Common/db-axios/useFacilitators';
import { useFetchEvents } from '../Calendar/hooks/useEvents';
import { LAVENDER_BACKGROUND } from '../../styles';
import { EventListItem } from '../Calendar/EventListItem';

const { height } = Dimensions.get('window');
const CAROUSEL_HEIGHT = height * 0.20;

export default function FacilitatorProfile() {
    const { params } = useRoute();
    const facilitatorId = params?.facilitatorId;

    const { data: facilitators, isLoading, error } = useFetchFacilitators();
    const { events } = useFetchEvents();
    const [tab, setTab] = useState<'bio' | 'events' | 'media'>('bio');

    const facilitator = facilitators?.find((f) => f.id === facilitatorId);

    if (isLoading) return <Text>Loading facilitators…</Text>;
    if (error || !facilitator) return <Text>Facilitator not found</Text>;

    const openLink = (url: string) => {
        Linking.canOpenURL(url).then((ok) => {
            if (ok) Linking.openURL(url);
            else Alert.alert('Cannot open link');
        });
    };

    const ownEvents = facilitator.event_ids
        .map((id) => events.find((e) => e.id === id))
        .filter(Boolean);

    return (
        <View style={styles.container}>
            {/* Carousel area */}
            {/* <View style={[styles.carousel, { height: CAROUSEL_HEIGHT }]} /> */}

            {/* Header area */}
            <View style={[styles.headerPurple]}>
                <Image
                    source={{ uri: facilitator.profile_image_url! }}
                    style={styles.photo}
                />
                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{facilitator.name}</Text>
                        {facilitator.verified && (
                            <MaterialIcons
                                name="check-circle"
                                size={18}
                                color="#4ADE80"
                                style={{ marginLeft: 6 }}
                            />
                        )}
                    </View>
                    <View style={styles.socialRow}>
                        <TouchableOpacity
                            style={styles.socialItem}
                            onPress={() => openLink(`https://www.instagram.com/${facilitator.instagram_handle}`)}
                        >
                            <FontAwesome name="instagram" size={30} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialItem}
                            onPress={() => openLink(`https://www.fetlife.com/users/${facilitator.fetlife_handle}`)}
                        >
                            <Image
                                source={{ uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc//fetlife_icon_white.png' }}
                                style={{ width: 24, height: 24 }}
                            />
                        </TouchableOpacity>
                    </View>
                    {facilitator.location && (
                        <Text style={styles.location}>From {facilitator.location}</Text>
                    )}
                    <View style={[styles.tagsRow, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }]}>
                        {facilitator.tags.slice(0, 6).map((t) => (
                            <View key={t.id} style={[styles.tag, { margin: 2 }]}>
                                <Text style={styles.tagText}>{t.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                {['bio', 'events', 'media'].map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tabButton, tab === t && styles.activeTab]}
                        onPress={() => setTab(t as any)}
                    >
                        <Text style={tab === t ? styles.activeTabText : styles.tabText}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content based on tab */}
            <ScrollView style={styles.content}>
                {tab === 'bio' && (
                    <View style={styles.bioContainer}>
                        <Markdown style={styles.markdown}>{facilitator.bio || ''}</Markdown>
                    </View>
                )}

                {tab === 'events' &&
                    ownEvents.map((e) => (
                        <EventListItem
                            item={e}
                            onPress={() => openLink(e.event_url)}
                        />
                    ))}

                {tab === 'media' && (
                    <View style={styles.mediaContainer}>
                        <TouchableOpacity
                            style={styles.mediaItem}
                            onPress={() => openLink(facilitator.intro_video_url!)}
                        >
                            <MaterialIcons name="play-circle-outline" size={32} color="#7F5AF0" />
                            <Text style={styles.mediaText}>Intro Video</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: LAVENDER_BACKGROUND },
    carousel: { backgroundColor: '#5E3FFD' },
    headerPurple: {
        backgroundColor: '#7F5AF0', flexDirection: 'row', padding: 16,


    },
    infoSection: { marginLeft: 16, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { color: '#fff', fontSize: 24, fontWeight: '700' },
    socialRow: { flexDirection: 'row', marginTop: 6 },
    location: { color: '#DDD', fontSize: 12, marginTop: 6 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    tagText: { color: '#7F3FFF', fontSize: 12 },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
    tabButton: { paddingVertical: 8 },
    tabText: { color: '#888' },
    activeTabText: { color: '#7F5AF0', fontWeight: '600' },
    content: { paddingHorizontal: 0 },
    bioContainer: { padding: 16 },
    mediaContainer: { padding: 16 },
    markdown: { body: { color: '#555', fontSize: 14 } },
    eventRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE' },
    eventName: { fontSize: 16, fontWeight: '600' },
    eventSub: { fontSize: 12, color: '#8E8E93' },
    mediaItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    mediaText: { marginLeft: 8, fontSize: 16, color: '#7F5AF0' },
    tag: {
        backgroundColor: '#EAEAFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: 8,
        marginTop: 6,
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    socialItem: {
        marginRight: 12,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderColor: '#6C3DD9',
    },

});