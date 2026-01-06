import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Linking, Alert } from 'react-native';
import { colors, fontFamilies, fontSizes, radius, spacing, sizes } from '../../../components/styles';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchFollows, useFollow, useUnfollow } from '../../../Common/db-axios/useFollows';
import { FollowButton } from './FollowButton';
import { logEvent } from '../../../Common/hooks/logger';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { UE } from '../../../userEventTypes';

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

    const analyticsProps = useAnalyticsProps();

    return (
        <View style={[styles.header]}>
            <View style={styles.headerTop}>
                {photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} />}
                <View style={styles.infoSection}>
                    {/* <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        {verified && <MaterialIcons name="check-circle" size={18} color="white" style={{ marginLeft: 6 }} />}
                    </View> */}
                    <Text
                        style={styles.title}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {title}
                    </Text>
                    <View style={styles.socialRow}>
                        <FollowButton followeeId={facilitatorId} followeeType="facilitator" />

                        {instagram && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => openLink(`https://instagram.com/${instagram}`)}>
                                <FontAwesome name="instagram" size={SOCIAL_ITEM_HEIGHT} color={colors.white} />
                            </TouchableOpacity>
                        )}
                        {fetlife && (
                            <TouchableOpacity
                                style={styles.socialItem}
                                onPress={() => {
                                    openLink(`https://fetlife.com/${fetlife}`);
                                    logEvent(UE.FacilitatorsProfileFetlifePressed, {
                                        ...analyticsProps,
                                        url: `https://fetlife.com/${fetlife}`,
                                        facilitator_id: facilitatorId,
                                    });
                                }}
                            >
                                <Image
                                    style={{ width: SOCIAL_ITEM_HEIGHT, height: SOCIAL_ITEM_HEIGHT }}
                                    source={{
                                        uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc//fetlife_icon_white.png',
                                    }}
                                />
                            </TouchableOpacity>
                        )}
                        {website && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => {
                                openLink(website);
                                logEvent(UE.FacilitatorsProfileWebsitePressed, {
                                    ...analyticsProps,
                                    url: website,
                                    facilitator_id: facilitatorId,
                                });
                            }}>
                                <FontAwesome name="globe" size={SOCIAL_ITEM_HEIGHT} color={colors.white} />
                            </TouchableOpacity>
                        )}
                        {email && (
                            <TouchableOpacity style={styles.socialItem} onPress={() => {
                                openLink(`mailto:${email}`);
                                logEvent(UE.FacilitatorsProfileEmailPressed, {
                                    ...analyticsProps,
                                    email: email,
                                    facilitator_id: facilitatorId,
                                });
                            }}>
                                <FontAwesome name="envelope" size={SOCIAL_ITEM_HEIGHT} color={colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const SOCIAL_ITEM_HEIGHT = sizes.socialIcon;

const styles = StyleSheet.create({
    header: {
        backgroundColor: 'transparent',
        paddingHorizontal: spacing.lg,
        zIndex: 1,
        paddingTop: spacing.smPlus
    },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
    photo: {
        width: sizes.avatarLg,
        height: sizes.avatarLg,
        borderRadius: sizes.avatarLg / 2,
        borderWidth: spacing.xxs,
        borderColor: colors.white,
    },
    infoSection: { marginLeft: spacing.lg, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: {
        color: colors.white,
        fontSize: fontSizes.headline,
        fontWeight: '700',
        fontFamily: fontFamilies.display,
    },
    title: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    socialRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    socialItem: { marginRight: spacing.xs },
    bookButton: {
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
        borderRadius: radius.xl,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.white,

    },
    bookButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
    },

    // FOLLOW BUTTON
    followButton: {
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lgPlus,
        borderWidth: 1,
        alignSelf: 'flex-start',
        marginRight: spacing.xs,
    },

    followButtonActive: {
        backgroundColor: colors.white,
        borderColor: colors.white,
    },

    unfollowButton: {
        backgroundColor: 'transparent',
        borderColor: colors.white,
    },

    followButtonText: {
        fontWeight: '600',
        fontSize: fontSizes.base,
        fontFamily: fontFamilies.body,
    },

    followText: {
        color: colors.headerPurple,
    },

    unfollowText: {
        color: colors.white,
    },
});
