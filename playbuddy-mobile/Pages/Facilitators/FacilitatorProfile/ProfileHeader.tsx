import { View, StyleSheet, Text, TouchableOpacity, Button } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Linking, Alert } from 'react-native';
import { HEADER_PURPLE } from '../../../components/styles';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchFollows, useFollow, useUnfollow } from '../../../Common/db-axios/useFollows';
import { FollowButton } from './FollowButton';

export const ProfileHeader = ({
    facilitatorId,
    photoUrl,
    name,
    verified,
    title,
    instagram,
    fetlife,
    website,
    email,
    paddingTop,
}: {
    facilitatorId: string;
    photoUrl?: string;
    name: string;
    verified: boolean;
    title: string;
    instagram?: string;
    fetlife?: string;
    website?: string;
    email?: string;
    paddingTop?: boolean;
}) => {
    const openLink = (url: string) =>
        Linking.canOpenURL(url).then(ok => (ok ? Linking.openURL(url) : Alert.alert('Cannot open link')));

    return (
        <View style={[styles.header, paddingTop ? { paddingTop: 24 } : undefined]}>
            <View style={styles.headerTop}>
                {photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} />}
                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        {verified && <MaterialIcons name="check-circle" size={18} color="white" style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.socialRow}>
                        <FollowButton followeeId={facilitatorId} followeeType="facilitator" />

                        {instagram && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(`https://instagram.com/${instagram}`)}>
                                <FontAwesome name="instagram" size={SOCIAL_ITEM_HEIGHT} color="white" />
                            </TouchableOpacity>
                        )}
                        {fetlife && (
                            <TouchableOpacity
                                style={styles.socialItem}
                                onPress={() => openLink(`https://fetlife.com/${fetlife}`)}
                            >
                                <Image
                                    style={{ width: SOCIAL_ITEM_HEIGHT, height: SOCIAL_ITEM_HEIGHT }}
                                    source={{
                                        uri:
                                            'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc//fetlife_icon_white.png',
                                    }}
                                />
                            </TouchableOpacity>
                        )}
                        {website && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(website)}>
                                <FontAwesome name="globe" size={SOCIAL_ITEM_HEIGHT} color="white" />
                            </TouchableOpacity>
                        )}
                        {email && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(`mailto:${email}`)}>
                                <FontAwesome name="envelope" size={SOCIAL_ITEM_HEIGHT} color="white" />
                            </TouchableOpacity>
                        )}
                        {email && (
                            <TouchableOpacity
                                style={styles.bookButton}
                                onPress={() => Linking.openURL(`mailto:${email}?subject=Book%20Private%20Session`)}
                            >
                                <Text style={styles.bookButtonText}>Book Session</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const SOCIAL_ITEM_HEIGHT = 30;

const styles = StyleSheet.create({
    header: {
        backgroundColor: HEADER_PURPLE,
        paddingHorizontal: 16,
        paddingBottom: 24,
        zIndex: 1,
    },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
    photo: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#fff' },
    infoSection: { marginLeft: 16, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { color: '#fff', fontSize: 24, fontWeight: '700' },
    title: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },
    socialRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 12,
    },
    socialItem: { marginRight: 4 },
    bookButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#fff',

    },
    bookButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    // FOLLOW BUTTON
    followButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
        alignSelf: 'flex-start',
        marginRight: 4,
    },

    followButtonActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },

    unfollowButton: {
        backgroundColor: 'transparent',
        borderColor: '#fff',
    },

    followButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },

    followText: {
        color: HEADER_PURPLE,
    },

    unfollowText: {
        color: '#fff',
    },


});