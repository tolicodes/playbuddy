import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    Alert,
    View,
    Text,
    StyleSheet,
    SectionList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Dimensions,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import type { EventAttendees } from '../../commonTypes';
import type { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useGroupedEvents } from '../Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from '../Calendar/ListView/EventListItem';
import { useFetchAttendees } from '../../Common/db-axios/useAttendees';
import { useFetchWishlistByCode } from '../../Common/db-axios/useWishlist';
import { useToggleWeeklyPickEvent } from '../../Common/db-axios/useEvents';
import { ADMIN_EMAILS, API_BASE_URL } from '../../config';
import {
    colors,
    eventListThemes,
    fontFamilies,
    fontSizes,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

const PB_SHARE_CODE = 'DCK9PD';
const HEADER_HEIGHT = 34;

type PreviewHeaderProps = {
    previewLoading: boolean;
    downloadLoading: boolean;
    generationInProgress: boolean;
    generationCountdown: number;
    countdownLabel: string;
    previewSource: { uri: string; cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached' };
    previewError: boolean;
    onGenerate: () => void;
    onDownload: () => void;
    onLoadStart: () => void;
    onLoad: () => void;
    onLoadEnd: () => void;
    onError: () => void;
};

const PreviewHeader = React.memo(({
    previewLoading,
    downloadLoading,
    generationInProgress,
    generationCountdown,
    countdownLabel,
    previewSource,
    previewError,
    onGenerate,
    onDownload,
    onLoadStart,
    onLoad,
    onLoadEnd,
    onError,
}: PreviewHeaderProps) => (
    <View style={styles.previewCard}>
        <View style={styles.previewHeaderRow}>
            <Text style={styles.previewTitle}>Weekly Picks Preview</Text>
            <View style={styles.previewActions}>
                <TouchableOpacity
                    style={[
                        styles.previewActionButton,
                        (downloadLoading || generationInProgress) && styles.previewActionButtonDisabled,
                    ]}
                    onPress={onGenerate}
                    disabled={downloadLoading || generationInProgress}
                >
                    {generationInProgress ? (
                        <ActivityIndicator size="small" color={colors.brandIndigo} />
                    ) : (
                        <Ionicons
                            name="refresh-outline"
                            size={16}
                            color={colors.brandIndigo}
                        />
                    )}
                    <Text style={styles.previewActionText}>
                        {generationInProgress ? 'Generating' : 'Generate'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.previewActionButton,
                        (!previewLoading && !previewError && !downloadLoading) ? null : styles.previewActionButtonDisabled,
                    ]}
                    onPress={onDownload}
                    disabled={previewLoading || previewError || downloadLoading}
                >
                    {downloadLoading ? (
                        <ActivityIndicator size="small" color={colors.brandIndigo} />
                    ) : (
                        <Ionicons
                            name="download-outline"
                            size={16}
                            color={colors.brandIndigo}
                        />
                    )}
                    <Text style={styles.previewActionText}>Download</Text>
                </TouchableOpacity>
            </View>
        </View>
        {generationInProgress && (
            <View style={styles.previewCountdownRow}>
                <Ionicons name="time-outline" size={16} color={colors.textOnDarkMuted} />
                {generationCountdown > 0 ? (
                    <>
                        <Text style={styles.previewCountdownText}>{countdownLabel}</Text>
                        <Text style={styles.previewCountdownLabel}>remaining</Text>
                    </>
                ) : (
                    <Text style={styles.previewCountdownText}>Still working...</Text>
                )}
            </View>
        )}
        <View style={styles.previewImageFrame}>
            <Image
                source={previewSource}
                style={styles.previewImage}
                resizeMode="contain"
                onLoadStart={onLoadStart}
                onLoad={onLoad}
                onLoadEnd={onLoadEnd}
                onError={onError}
            />
            {previewLoading && (
                <View style={styles.previewLoader}>
                    <ActivityIndicator size="large" color={colors.brandIndigo} />
                    <Text style={styles.previewLoaderText}>Rendering preview...</Text>
                </View>
            )}
            {previewError && !previewLoading && (
                <View style={styles.previewError}>
                    <Text style={styles.previewErrorText}>Unable to load weekly picks preview.</Text>
                </View>
            )}
        </View>
        {generationInProgress && (
            <Text style={styles.previewCountdownFootnote}>
                {generationCountdown > 0
                    ? (generationCountdown >= 25 ? 'Starting generation...' : 'Still working...')
                    : 'Waiting for render to finish...'}
            </Text>
        )}
    </View>
));

export const WeeklyPicksAdminScreen = () => {
    const navigation = useNavigation<NavStack>();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { allEvents, isLoadingEvents } = useCalendarContext();
    const { data: attendees = [] } = useFetchAttendees();
    const { data: wishlist = [], isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { mutate: toggleWeeklyPickEvent, isPending: togglePending } = useToggleWeeklyPickEvent();
    const [previewVersion, setPreviewVersion] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(true);
    const [previewError, setPreviewError] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [generationInProgress, setGenerationInProgress] = useState(false);
    const [generationCountdown, setGenerationCountdown] = useState(0);
    const lastLoadedPreviewUrlRef = useRef<string | null>(null);
    const countdownLabel = useMemo(() => {
        const totalSeconds = Math.max(0, generationCountdown);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }, [generationCountdown]);

    const attendeesByEvent = useMemo(() => {
        const map = new Map<number, EventAttendees['attendees']>();
        attendees.forEach((entry) => map.set(entry.event_id, entry.attendees || []));
        return map;
    }, [attendees]);

    const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
    const { sections } = useGroupedEvents(allEvents);
    const eventListConfig = eventListThemes.welcome;
    const screenWidth = Dimensions.get('window').width;
    const previewScale = 3;
    const previewWidth = Math.round((screenWidth - spacing.lg * 2) * previewScale);
    const previewVersionParam = previewVersion ? `&v=${previewVersion}` : '';
    const previewUrl = `${API_BASE_URL}/events/weekly-picks/image?width=${previewWidth}${previewVersionParam}`;
    const previewSource = useMemo(
        () => ({ uri: previewUrl, cache: 'force-cache' }),
        [previewUrl]
    );

    useEffect(() => {
        if (previewUrl !== lastLoadedPreviewUrlRef.current) {
            setPreviewError(false);
            setPreviewLoading(true);
        }
    }, [previewUrl]);

    const handlePreviewLoadStart = useCallback(() => {
        if (previewUrl === lastLoadedPreviewUrlRef.current) {
            return;
        }
        console.log('[weekly-picks] preview load start', previewUrl);
        setPreviewError(false);
        setPreviewLoading(true);
    }, [previewUrl]);
    const handlePreviewLoad = useCallback(() => {
        console.log('[weekly-picks] preview load', previewUrl);
        lastLoadedPreviewUrlRef.current = previewUrl;
        setPreviewLoading(false);
        setPreviewError(false);
    }, [previewUrl]);
    const handlePreviewLoadEnd = useCallback(() => {
        console.log('[weekly-picks] preview load end', previewUrl);
        lastLoadedPreviewUrlRef.current = previewUrl;
        setPreviewLoading(false);
        setPreviewError(false);
    }, [previewUrl]);
    const handlePreviewError = useCallback(() => {
        setPreviewLoading(false);
        setPreviewError(true);
        console.warn('[weekly-picks] preview load failed', previewUrl);
    }, [previewUrl]);

    useEffect(() => {
        if (!generationInProgress) {
            setGenerationCountdown(0);
            return undefined;
        }

        setGenerationCountdown(30);
        const interval = setInterval(() => {
            setGenerationCountdown((prev) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [generationInProgress]);

    const handleGeneratePreview = async () => {
        if (downloadLoading || generationInProgress) return;
        try {
            setPreviewError(false);
            setPreviewLoading(false);
            setGenerationInProgress(true);
            console.log('[weekly-picks] generate start', previewUrl);
            const response = await axios.post(`${API_BASE_URL}/events/weekly-picks/image/generate`, null, {
                params: { width: previewWidth, format: 'json' },
            });
            const versionHeader = response.headers?.['x-weekly-picks-version'];
            const versionBody = response.data?.version;
            console.log('[weekly-picks] generate response', {
                status: response.status,
                version: versionBody ?? versionHeader,
                durationMs: response.headers?.['x-weekly-picks-generate-duration-ms'],
            });
            setPreviewVersion(String(versionBody ?? versionHeader ?? Date.now()));
        } catch (error) {
            console.warn('Failed to generate weekly picks preview', error);
            Alert.alert('Generation failed', 'Unable to start image generation.');
            setPreviewLoading(false);
            setGenerationInProgress(false);
            return;
        }
        setGenerationInProgress(false);
    };

    const handleDownloadPreview = async () => {
        if (downloadLoading) return;
        if (previewLoading) {
            Alert.alert('Preview still rendering', 'Please wait for the preview to finish loading.');
            return;
        }
        if (previewError) {
            Alert.alert('Preview unavailable', 'Generate the image again before downloading.');
            return;
        }

        try {
            setDownloadLoading(true);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `weekly_picks_${timestamp}.png`;
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!baseDir) {
                await Linking.openURL(previewUrl);
                return;
            }
            const fileUri = `${baseDir}${fileName}`;
            const download = await FileSystem.downloadAsync(previewUrl, fileUri);
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(download.uri, {
                    mimeType: 'image/png',
                    dialogTitle: 'Weekly Picks',
                    UTI: 'public.png',
                });
            } else {
                await Linking.openURL(previewUrl);
            }
        } catch (error) {
            console.warn('Failed to download weekly picks image', error);
            Alert.alert('Download failed', 'Unable to save the image. Please try again.');
        } finally {
            setDownloadLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        Weekly Picks tools are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    if (isLoadingEvents || wishlistLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.linkBlue} />
                <Text style={styles.loadingText}>Loading Weekly Picks...</Text>
            </View>
        );
    }

    if (wishlistError) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load weekly picks data.</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: EventWithMetadata }) => {
        const attendeesForEvent = attendeesByEvent.get(item.id) || [];
        const isWeeklyPick = !!item.weekly_pick;
        const isInWishlist = wishlistSet.has(item.id);

        const adminFooter = (
            <View style={styles.adminActions}>
                <TouchableOpacity
                    style={[
                        styles.actionPill,
                        isWeeklyPick && styles.actionPillActive,
                    ]}
                    onPress={() =>
                        toggleWeeklyPickEvent(
                            { eventId: item.id, status: !isWeeklyPick }
                        )
                    }
                    disabled={togglePending}
                >
                    <Ionicons
                        name={isWeeklyPick ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={isWeeklyPick ? colors.brandIndigo : colors.textMuted}
                    />
                    <Text
                        style={[
                            styles.actionText,
                            isWeeklyPick && styles.actionTextActive,
                        ]}
                    >
                        Weekly Pick
                    </Text>
                </TouchableOpacity>

                <View
                    style={[
                        styles.actionPill,
                        styles.actionPillReadOnly,
                        isInWishlist && styles.actionPillWishlist,
                    ]}
                >
                    <Ionicons
                        name={isInWishlist ? 'heart' : 'heart-outline'}
                        size={16}
                        color={isInWishlist ? colors.brandPink : colors.textMuted}
                    />
                    <Text
                        style={[
                            styles.actionText,
                            isInWishlist && styles.actionTextWishlist,
                        ]}
                    >
                        PB Wishlist
                    </Text>
                </View>
            </View>
        );

        return (
            <EventListItem
                item={item}
                attendees={attendeesForEvent}
                onPress={(event) =>
                    navigation.push('Event Details', {
                        selectedEvent: event,
                        title: event.name,
                    })
                }
                isAdmin
                footerContent={adminFooter}
                autoHeight
            />
        );
    };

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <View style={styles.sectionHeaderOuterWrapper}>
            <View style={styles.sectionHeaderPill}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        </View>
    );

    return (
        <LinearGradient
            colors={eventListConfig.colors}
            locations={eventListConfig.locations}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.screenGradient}
        >
            <View pointerEvents="none" style={[styles.screenGlowTop, { backgroundColor: eventListConfig.glows[0] }]} />
            <View pointerEvents="none" style={[styles.screenGlowMid, { backgroundColor: eventListConfig.glows[1] }]} />
            <View pointerEvents="none" style={[styles.screenGlowBottom, { backgroundColor: eventListConfig.glows[2] }]} />

            <View style={styles.container}>
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    stickySectionHeadersEnabled={false}
                    style={styles.sectionList}
                    contentContainerStyle={styles.sectionListContent}
                    ListHeaderComponent={
                        <PreviewHeader
                            previewLoading={previewLoading}
                            downloadLoading={downloadLoading}
                            generationInProgress={generationInProgress}
                            generationCountdown={generationCountdown}
                            countdownLabel={countdownLabel}
                            previewSource={previewSource}
                            previewError={previewError}
                            onGenerate={handleGeneratePreview}
                            onDownload={handleDownloadPreview}
                            onLoadStart={handlePreviewLoadStart}
                            onLoad={handlePreviewLoad}
                            onLoadEnd={handlePreviewLoadEnd}
                            onError={handlePreviewError}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyText}>No events found</Text>
                        </View>
                    }
                />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    screenGradient: {
        flex: 1,
    },
    screenGlowTop: {
        position: 'absolute',
        top: -70,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
    },
    screenGlowMid: {
        position: 'absolute',
        top: 140,
        left: -120,
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    screenGlowBottom: {
        position: 'absolute',
        bottom: -70,
        left: -90,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sectionList: {
        flex: 1,
        marginTop: spacing.xs,
    },
    sectionListContent: {
        paddingBottom: spacing.xxxl,
    },
    previewCard: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    previewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    previewTitle: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.display,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    previewActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    previewCountdownText: {
        fontSize: fontSizes.lg,
        color: colors.textOnDarkStrong,
        fontFamily: fontFamilies.display,
        fontWeight: '700',
        letterSpacing: 1,
    },
    previewCountdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    previewCountdownLabel: {
        fontSize: fontSizes.sm,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    previewCountdownFootnote: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    previewActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        backgroundColor: colors.surfaceWhiteStrong,
    },
    previewActionButtonDisabled: {
        opacity: 0.6,
    },
    previewActionText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.brandIndigo,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    previewImageFrame: {
        height: 600,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        backgroundColor: colors.surfaceWhiteFrosted,
        overflow: 'hidden',
        ...shadows.brandCard,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewLoader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 18, 52, 0.35)',
    },
    previewLoaderText: {
        marginTop: spacing.sm,
        fontSize: fontSizes.sm,
        color: colors.textOnDarkStrong,
        fontFamily: fontFamilies.body,
    },
    previewError: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 18, 52, 0.35)',
        paddingHorizontal: spacing.lg,
    },
    previewErrorText: {
        fontSize: fontSizes.base,
        color: colors.white,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: spacing.md,
        paddingTop: spacing.md,
        marginHorizontal: spacing.lg,
    },
    sectionHeaderPill: {
        width: '100%',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        height: HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderLavenderSoft,
        alignSelf: 'stretch',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    sectionHeaderText: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    adminActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceWhiteStrong,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xxs,
        marginRight: spacing.sm,
    },
    actionPillActive: {
        backgroundColor: colors.tintViolet,
        borderColor: colors.borderLavenderAlt,
    },
    actionPillReadOnly: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderSubtle,
    },
    actionPillWishlist: {
        backgroundColor: 'rgba(255, 38, 117, 0.12)',
        borderColor: 'rgba(255, 38, 117, 0.35)',
    },
    actionText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    actionTextActive: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    actionTextWishlist: {
        color: colors.brandPink,
        fontWeight: '600',
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.jumbo,
    },
    emptyText: {
        fontSize: fontSizes.xl,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceMuted,
        padding: spacing.lg,
    },
    loadingText: {
        marginTop: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    errorText: {
        fontSize: fontSizes.base,
        color: colors.danger,
        margin: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    lockedCard: {
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        ...shadows.card,
    },
    lockedIcon: {
        width: 46,
        height: 46,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    lockedTitle: {
        fontSize: fontSizes.title,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.xs,
    },
    lockedText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: fontFamilies.body,
    },
});

export default WeeklyPicksAdminScreen;
