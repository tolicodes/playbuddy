import { View, StyleSheet, Text, TouchableOpacity, Button } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Linking, Alert } from 'react-native';
import { HEADER_PURPLE } from '../../../components/styles';

export const ProfileHeader = ({
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

const styles = StyleSheet.create({
    header: {
        backgroundColor: HEADER_PURPLE,
        paddingHorizontal: 16,
        paddingVertical: 24,
        zIndex: 1,
    },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
    photo: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#fff' },
    infoSection: { marginLeft: 16, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { color: '#fff', fontSize: 24, fontWeight: '700' },
    title: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },
    socialRow: { flexDirection: 'row', marginTop: 12 },
    socialItem: { marginRight: 10 },
    bookButton: {
        paddingVertical: 4,
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

});