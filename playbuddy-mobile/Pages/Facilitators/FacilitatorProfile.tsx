// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    FlatList,
    StyleSheet,
    Linking,
    Alert,
    Dimensions,
    Button,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Markdown from 'react-native-markdown-display';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFetchFacilitators } from '../../Common/db-axios/useFacilitators';
import { useFetchEvents } from '../Calendar/hooks/useEvents';
import { NavStack } from '../../Common/Nav/NavStackType';
import { EventListItem } from '../Calendar/EventListItem';
import { MediaCarousel } from '../../components/MediaCarousel';
import { ACCENT_PURPLE, HEADER_PURPLE } from '../../styles';
import type { Facilitator, Event } from '../../Common/types/commonTypes';
import { LinkifyText } from '../Munches/LinkifyText';

const { height } = Dimensions.get('window');

const Separator = () => <View style={styles.separator} />;

const TagsLocation = ({ facilitator }: { facilitator: Facilitator }) => (
    facilitator.location ? (
        <View style={styles.locationRowWhite}>
            <MaterialIcons name="location-on" size={18} color="#888" />
            <Text style={styles.locationWhite}>From {facilitator.location}</Text>
        </View>
    ) : null
);

const TagList = ({ tags }: { tags: { id: string; name: string }[] }) => (
    <View style={styles.tagsRow}>
        {tags.map(t => (
            <View key={t.id} style={styles.pill}>
                <Text style={styles.pillText}>{t.name}</Text>
            </View>
        ))}
    </View>
);

const BioTab = ({ bio, facilitator }: { bio: string; facilitator: Facilitator }) => (
    <View>
        <TagsLocation facilitator={facilitator} />
        <Separator />
        <View style={styles.bioContainer}>
            <Markdown style={styles.markdown}>{bio}</Markdown>
        </View>
        <TagList tags={facilitator.tags} />
    </View>
);

const EventsTab = ({
    events,
    navigation,
    facilitator,
}: {
    events: Event[];
    navigation: NavStack;
    facilitator: Facilitator;
}) => {
    const noEventsText = events.length
        ? null
        : (() => {
            let txt = `No events on PlayBuddy.\n`;
            if (facilitator.website) txt += `- Website: ${facilitator.website}\n`;
            if (facilitator.instagram_handle) txt += `- Instagram: @${facilitator.instagram_handle}\n`;
            if (facilitator.fetlife_handle) txt += `- FetLife: @${facilitator.fetlife_handle}\n`;
            return txt;
        })();

    if (noEventsText) {
        return (
            <View style={styles.emptyEventsContainer}>
                <LinkifyText style={styles.emptyEventsText}>{noEventsText}</LinkifyText>
            </View>
        );
    }

    return (
        <FlatList
            data={events}
            keyExtractor={e => e.id}
            renderItem={({ item }) => (
                <EventListItem
                    item={item}
                    onPress={() =>
                        navigation.navigate('Event Details', { selectedEvent: item })
                    }
                />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        />
    );
};

const TabBar = ({
    active,
    onPress,
}: {
    active: 'bio' | 'events' | 'media';
    onPress: (tab: 'bio' | 'events' | 'media') => void;
}) => (
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
);

const ProfileHeader = ({
    photoUrl,
    name,
    verified,
    title,
    instagram,
    fetlife,
    website,
    email,
}: {
    photoUrl?: string;
    name: string;
    verified: boolean;
    title: string;
    instagram?: string;
    fetlife?: string;
    website?: string;
    email?: string;
}) => {
    const openLink = (url: string) =>
        Linking.canOpenURL(url).then(ok => (ok ? Linking.openURL(url) : Alert.alert('Cannot open link')));
    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                {photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} />}
                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        {verified && <MaterialIcons name="check-circle" size={18} color="white" style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.socialRow}>
                        {instagram && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(`https://instagram.com/${instagram}`)}>
                                <FontAwesome name="instagram" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        {fetlife && (
                            <TouchableOpacity
                                style={styles.socialItem}
                                onPress={() => openLink(`https://fetlife.com/${fetlife}`)}
                            >
                                <Image
                                    style={{ width: 24, height: 24 }}
                                    source={{
                                        uri:
                                            'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc//fetlife_icon_white.png',
                                    }}
                                />
                            </TouchableOpacity>
                        )}
                        {website && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(website)}>
                                <FontAwesome name="globe" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        {email && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(`mailto:${email}`)}>
                                <FontAwesome name="envelope" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        {email && (
                            <Button
                                title="Book Private"
                                onPress={() => Linking.openURL(`mailto:${email}?subject=Book%20Private%20Session`)}
                            />
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const { params } = useRoute<any>();
    const facilitatorId = params?.facilitatorId;
    const navigation = useNavigation<NavStack>();
    const { data: facilitators, isLoading, error } = useFetchFacilitators();
    const { events } = useFetchEvents();
    const [activeTab, setActiveTab] = useState<'bio' | 'events' | 'media'>('bio');

    if (isLoading) return <Text>Loading…</Text>;
    if (error) return <Text>Profile not found</Text>;

    const facilitator = facilitators?.find(f => f.id === facilitatorId);
    if (!facilitator) return <Text>Profile not found</Text>;

    const ownEvents = facilitator.event_ids
        .map(id => events.find(e => e.id === id))
        .filter(Boolean) as Event[];

    return (
        <View style={styles.container}>
            <ProfileHeader
                photoUrl={facilitator.profile_image_url}
                name={facilitator.name}
                verified={facilitator.verified}
                title={facilitator.title}
                instagram={facilitator.instagram_handle}
                fetlife={facilitator.fetlife_handle}
                website={facilitator.website}
                email={facilitator.email}
            />

            <View style={styles.bottom}>
                <TabBar active={activeTab} onPress={setActiveTab} />

                {/* Render one tab’s content at a time */}
                {activeTab === 'bio' && (
                    <ScrollView style={styles.scroll}>
                        <BioTab bio={facilitator.bio || ''} facilitator={facilitator} />
                    </ScrollView>
                )}

                {activeTab === 'events' && (
                    <EventsTab events={ownEvents} navigation={navigation} facilitator={facilitator} />
                )}

                {activeTab === 'media' && <MediaCarousel medias={facilitator.media} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: ACCENT_PURPLE },
    header: {
        backgroundColor: HEADER_PURPLE,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
    photo: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#fff' },
    infoSection: { marginLeft: 16, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { color: '#fff', fontSize: 24, fontWeight: '700' },
    title: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },
    socialRow: { flexDirection: 'row', marginTop: 12 },
    socialItem: { marginRight: 10 },
    bottom: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        overflow: 'hidden',
    },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
    tabButton: { paddingVertical: 8 },
    tabText: { color: '#888' },
    activeTab: { borderBottomWidth: 3, borderColor: ACCENT_PURPLE },
    activeTabText: { color: ACCENT_PURPLE, fontWeight: '600' },

    scroll: { flex: 1, paddingTop: 8 },
    list: { paddingHorizontal: 16, paddingTop: 8 },

    separator: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
    locationRowWhite: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    locationWhite: { color: '#555', marginLeft: 6 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 },
    pill: { backgroundColor: HEADER_PURPLE, borderRadius: 16, paddingHorizontal: 12, margin: 4, height: 32, justifyContent: 'center' },
    pillText: { color: '#fff', fontSize: 14 },

    bioContainer: { padding: 16 },
    markdown: { body: { color: '#333', fontSize: 16, lineHeight: 22 } },

    emptyEventsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyEventsText: { color: '#000', fontSize: 16 },
});
