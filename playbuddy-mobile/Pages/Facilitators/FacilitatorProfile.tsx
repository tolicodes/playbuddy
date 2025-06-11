// src/screens/ProfileScreen.tsx
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFetchFacilitators } from '../../Common/db-axios/useFacilitators';
import { useFetchEvents } from '../Calendar/hooks/useEvents';
import { NavStack } from '../../Common/Nav/NavStackType';
import { EventListItem } from '../Calendar/EventListItem';
import { MediaCarousel } from './MediaCarousel';
import { ACCENT_PURPLE, HEADER_PURPLE } from '../../styles';
import { Facilitator } from '../../../playbuddy-admin/src/common/types/commonTypes';

const { height } = Dimensions.get('window');

// Horizontal separator under tags
const Separator = () => <View style={tabStyles.separator} />;

// Horizontal list of tag pills
const TagList = ({ tags }: { tags: { id: string; name: string }[] }) => (
    <View style={tabStyles.tagsRow}>
        {tags.map(t => (
            <View key={t.id} style={tabStyles.pill}>
                <Text style={tabStyles.pillText}>{t.name}</Text>
            </View>
        ))}
    </View>
);

// Bio tab content
const BioTab = ({ bio, facilitator }: { bio: string, facilitator: Facilitator }) => (
    <View>
        <TagsLocation facilitator={facilitator} />
        <Separator />

        <View style={tabStyles.bioContainer}>
            <Markdown style={tabStyles.markdown}>{bio}</Markdown>
        </View>
    </View>
);

// Tab bar component
const TabBar = ({
    active,
    onPress,
}: {
    active: 'bio' | 'events' | 'media';
    onPress: (tab: 'bio' | 'events' | 'media') => void;
}) => (
    <View style={tabStyles.tabRow}>
        {['bio', 'events', 'media'].map(key => (
            <TouchableOpacity
                key={key}
                style={[tabStyles.tabButton, active === key && tabStyles.activeTab]}
                onPress={() => onPress(key as any)}
            >
                <Text
                    style={
                        active === key
                            ? tabStyles.activeTabText
                            : tabStyles.tabText
                    }
                >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);

// Header with photo, name, title, and social icons
const ProfileHeader = ({
    photoUrl,
    name,
    verified,
    title,
    instagram,
    fetlife,
    website,
}: {
    photoUrl?: string;
    name: string;
    verified: boolean;
    title: string;
    instagram?: string;
    fetlife?: string;
    website?: string;
}) => {
    const openLink = (url: string) => {
        Linking.canOpenURL(url).then(ok => {
            if (ok) Linking.openURL(url);
            else Alert.alert('Cannot open link');
        });
    };
    return (
        <View style={tabStyles.header}>
            <View style={tabStyles.headerTop}>
                {photoUrl && (
                    <Image
                        source={{ uri: photoUrl }}
                        style={tabStyles.photo}
                    />
                )}
                <View style={tabStyles.infoSection}>
                    <View style={tabStyles.nameRow}>
                        <Text style={tabStyles.name}>{name}</Text>
                        {verified && (
                            <MaterialIcons
                                name="check-circle"
                                size={18}
                                color="white"
                                style={{ marginLeft: 6 }}
                            />
                        )}
                    </View>
                    <Text style={tabStyles.title}>{title}</Text>

                    <View style={tabStyles.socialRow}>
                        {instagram && (
                            <TouchableOpacity
                                style={tabStyles.socialItem}
                                onPress={() => openLink(`https://instagram.com/${instagram}`)}
                            >
                                <FontAwesome name="instagram" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        {fetlife && (
                            <TouchableOpacity
                                style={tabStyles.socialItem}
                                onPress={() => openLink(`https://fetlife.com/${fetlife}`)}
                            >
                                <Image style={{ width: 24, height: 24 }} source={{ uri: "https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc//fetlife_icon_white.png" }} />
                            </TouchableOpacity>
                        )}
                        {website && (
                            <TouchableOpacity
                                style={tabStyles.socialItem}
                                onPress={() => openLink(website)}
                            >
                                <FontAwesome name="globe" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

        </View>
    );
};

const TagsLocation = ({ facilitator }: { facilitator: Facilitator }) => (
    <View>
        <TagList tags={facilitator.tags} />

        {
            facilitator.location ? (
                <View style={tabStyles.locationRowWhite}>
                    <MaterialIcons
                        name="location-on"
                        size={18}
                        color="#888"
                    />
                    <Text style={tabStyles.locationWhite}>
                        From {facilitator.location}
                    </Text>
                </View>
            ) : null
        }
    </View>
)

// Main screen
export default function ProfileScreen() {
    const { params } = useRoute<any>();
    const facilitatorId = params?.facilitatorId;
    const navigation = useNavigation<NavStack>();
    const { data: facilitators, isLoading, error } = useFetchFacilitators();
    const { events } = useFetchEvents();
    const [activeTab, setActiveTab] = useState<
        'bio' | 'events' | 'media'
    >('bio');

    if (isLoading) return <Text>Loading…</Text>;
    if (error) return <Text>Profile not found</Text>;

    const facilitator = facilitators?.find(
        f => f.id === facilitatorId
    );
    if (!facilitator) return <Text>Profile not found</Text>;

    const ownEvents = facilitator.event_ids
        .map(id => events.find(e => e.id === id))
        .filter(Boolean) as typeof events;

    return (
        <View style={tabStyles.container}>
            <ProfileHeader
                photoUrl={facilitator.profile_image_url}
                name={facilitator.name}
                verified={facilitator.verified}
                title={facilitator.title}
                instagram={facilitator.instagram_handle}
                fetlife={facilitator.fetlife_handle}
                website={facilitator.website}
            />

            <View style={tabStyles.bottom}>
                <TabBar
                    active={activeTab}
                    onPress={setActiveTab}
                />
                <ScrollView style={tabStyles.content}>
                    {activeTab === 'bio' && <BioTab bio={facilitator.bio || ''} facilitator={facilitator} />}

                    {activeTab === 'events' &&
                        ownEvents.map(e => (
                            <EventListItem
                                key={e.id}
                                item={e}
                                onPress={() =>
                                    navigation.navigate('Event Details', {
                                        selectedEvent: e,
                                    })
                                }
                            />
                        ))}

                    {activeTab === 'media' && (
                        <View
                            style={{ height: height * 0.3 }}
                        >
                            <MediaCarousel
                                urls={facilitator.media.map(m => m.url)}
                            />
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

// Shared styles
const tabStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ACCENT_PURPLE,
    },
    header: {
        backgroundColor: HEADER_PURPLE,
        paddingHorizontal: 16,
        alignItems: 'flex-start',
        paddingBottom: 30,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#fff',
    },
    infoSection: { marginLeft: 16, flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    socialRow: {
        flexDirection: 'row',
        marginTop: 12,
        marginBottom: 8,
        justifyContent: 'flex-start',
        alignContent: 'flex-start',
    },
    socialItem: {
        marginRight: 10,
        alignItems: 'flex-end'
    },
    bottom: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        overflow: 'hidden',
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    tabButton: { paddingVertical: 8 },
    tabText: { color: '#888' },
    activeTab: { borderBottomWidth: 3, borderColor: ACCENT_PURPLE },
    activeTabText: { color: ACCENT_PURPLE, fontWeight: '600' },
    locationRowWhite: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    locationWhite: { color: '#555', marginLeft: 6 },
    tagsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexWrap: 'wrap',
    },
    separator: {
        height: 1,
        backgroundColor: '#EEE',
        marginHorizontal: 16,
    },
    pill: {
        backgroundColor: HEADER_PURPLE,
        borderRadius: 16,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 4,

    },
    addPill: {
        backgroundColor: ACCENT_PURPLE,
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    pillText: { color: '#fff', fontSize: 14 },
    content: { flex: 1 },
    bioContainer: { padding: 16 },
    markdown: { body: { color: '#333', fontSize: 16, lineHeight: 22 } },
});
