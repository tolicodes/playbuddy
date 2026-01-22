import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    Alert,
    View,
    Text,
    TextInput,
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
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import moment from 'moment-timezone';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import type { EventAttendees } from '../../commonTypes';
import type { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useGroupedEvents } from '../Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from '../Calendar/ListView/EventListItem';
import { useFetchAttendees } from '../../Common/db-axios/useAttendees';
import { useCreateWeeklyPicksBranchLink } from '../../Common/db-axios/useBranchLinks';
import { useAddDeepLink } from '../../Common/db-axios/useDeepLinks';
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
const BRANCH_TZ = 'America/New_York';

const getWeekRangeLabel = (start: moment.Moment) => {
    const end = start.clone().add(6, 'days');
    return `${start.format('MMM D')} - ${end.format('MMM D')}`;
};

const buildWeeklyPicksCampaignName = (weekLabel: string) => `Weekly Picks (${weekLabel})`;
const buildWeeklyPicksOgDescription = (weekLabel: string) => `Weekly Picks for ${weekLabel} on Playbuddy.`;

const extractBranchSlug = (link?: string | null) => {
    if (!link) return '';
    const trimmed = link.trim();
    if (!trimmed) return '';
    try {
        const url = new URL(trimmed);
        return url.pathname.replace(/^\/+/, '').split('/')[0] ?? '';
    } catch {
        return trimmed.replace(/^https?:\/\/l\.playbuddy\.me\//i, '').split(/[?#]/)[0];
    }
};

type PreviewHeaderProps = {
    previewLoading: boolean[];
    downloadLoading: boolean;
    generationInProgress: boolean;
    generateBusy: boolean;
    generationCountdown: number;
    countdownLabel: string;
    previewSources: { uri: string; cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached' }[];
    previewError: boolean[];
    onGenerate: () => void;
    onDownload: (index: number) => void;
    onLoadStart: (index: number) => void;
    onLoad: (index: number) => void;
    onLoadEnd: (index: number) => void;
    onError: (index: number) => void;
};

const PreviewHeader = React.memo(({
    previewLoading,
    downloadLoading,
    generationInProgress,
    generateBusy,
    generationCountdown,
    countdownLabel,
    previewSources,
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
                        (downloadLoading || generateBusy) && styles.previewActionButtonDisabled,
                    ]}
                    onPress={onGenerate}
                    disabled={downloadLoading || generateBusy}
                >
                    {generateBusy ? (
                        <ActivityIndicator size="small" color={colors.brandIndigo} />
                    ) : (
                        <Ionicons
                            name="refresh-outline"
                            size={16}
                            color={colors.brandIndigo}
                        />
                    )}
                    <Text style={styles.previewActionText}>
                        {generateBusy ? 'Generating' : 'Generate'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.previewActionButton,
                        (!previewLoading[0] && !previewError[0] && !downloadLoading) ? null : styles.previewActionButtonDisabled,
                    ]}
                    onPress={() => onDownload(0)}
                    disabled={previewLoading[0] || previewError[0] || downloadLoading}
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
                    <Text style={styles.previewActionText}>Download 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.previewActionButton,
                        (!previewLoading[1] && !previewError[1] && !downloadLoading) ? null : styles.previewActionButtonDisabled,
                    ]}
                    onPress={() => onDownload(1)}
                    disabled={previewLoading[1] || previewError[1] || downloadLoading}
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
                    <Text style={styles.previewActionText}>Download 2</Text>
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
        <View style={styles.previewImageGrid}>
            {previewSources.map((source, index) => (
                <View key={`preview-part-${index}`} style={styles.previewImageGroup}>
                    <Text style={styles.previewPartLabel}>Part {index + 1}</Text>
                    <View style={styles.previewImageFrame}>
                        <Image
                            source={source}
                            style={styles.previewImage}
                            resizeMode="contain"
                            onLoadStart={() => onLoadStart(index)}
                            onLoad={() => onLoad(index)}
                            onLoadEnd={() => onLoadEnd(index)}
                            onError={() => onError(index)}
                        />
                        {previewLoading[index] && (
                            <View style={styles.previewLoader}>
                                <ActivityIndicator size="large" color={colors.brandIndigo} />
                                <Text style={styles.previewLoaderText}>Rendering preview...</Text>
                            </View>
                        )}
                        {previewError[index] && !previewLoading[index] && (
                            <View style={styles.previewError}>
                                <Text style={styles.previewErrorText}>Unable to load part {index + 1}.</Text>
                            </View>
                        )}
                    </View>
                </View>
            ))}
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

    const { allEvents, isLoadingEvents, isEventSourceExcluded } = useCalendarContext();
    const { data: attendees = [] } = useFetchAttendees();
    const { data: wishlist = [], isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { mutate: toggleWeeklyPickEvent, isPending: togglePending } = useToggleWeeklyPickEvent();
    const createWeeklyPicksBranchLink = useCreateWeeklyPicksBranchLink();
    const createWeeklyPicksDeepLink = useAddDeepLink();
    const [previewVersion, setPreviewVersion] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState([true, true]);
    const [previewError, setPreviewError] = useState([false, false]);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [generationInProgress, setGenerationInProgress] = useState(false);
    const [branchCreationInProgress, setBranchCreationInProgress] = useState(false);
    const [branchCreationError, setBranchCreationError] = useState<string | null>(null);
    const [generationCountdown, setGenerationCountdown] = useState(0);
    const lastLoadedPreviewUrlRef = useRef<string[]>([]);
    const [shareLink, setShareLink] = useState('');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownLabel = useMemo(() => {
        const totalSeconds = Math.max(0, generationCountdown);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }, [generationCountdown]);
    const shareMessage = useMemo(() => {
        const linkValue = shareLink.trim() || '<link>';
        return [
            '*PB’s Weekly Picks*',
            'Weekly picks are out!!',
            '',
            'As always, discounts on Pagan’s, Tantra Institute, Everyday Tantra, and Night Owls!',
            '',
            linkValue,
        ].join('\n');
    }, [shareLink]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const attendeesByEvent = useMemo(() => {
        const map = new Map<number, EventAttendees['attendees']>();
        attendees.forEach((entry) => map.set(entry.event_id, entry.attendees || []));
        return map;
    }, [attendees]);

    const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
    const eligibleEvents = useMemo(() => {
        return allEvents.filter((event) => {
            const approval = event.approval_status ?? null;
            if (approval && approval !== 'approved') return false;
            if (isEventSourceExcluded?.(event)) return false;
            return true;
        });
    }, [allEvents, isEventSourceExcluded]);
    const { sections } = useGroupedEvents(eligibleEvents);
    const eventListConfig = eventListThemes.welcome;
    const screenWidth = Dimensions.get('window').width;
    const previewScale = 3;
    const previewWidth = Math.round((screenWidth - spacing.lg * 2) * previewScale);
    const previewUrls = useMemo(() => {
        const previewVersionParam = previewVersion ? `&v=${previewVersion}` : '';
        return [1, 2].map(
            (part) => `${API_BASE_URL}/events/weekly-picks/image?width=${previewWidth}&part=${part}&format=jpg${previewVersionParam}`
        );
    }, [previewVersion, previewWidth]);
    const previewSources = useMemo(
        () => previewUrls.map((uri) => ({ uri, cache: 'force-cache' })),
        [previewUrls]
    );

    useEffect(() => {
        const hasChanges = previewUrls.some((url, index) => url !== lastLoadedPreviewUrlRef.current[index]);
        if (hasChanges) {
            setPreviewError([false, false]);
            setPreviewLoading([true, true]);
        }
    }, [previewUrls]);

    const handlePreviewLoadStart = useCallback((index: number) => {
        if (previewUrls[index] === lastLoadedPreviewUrlRef.current[index]) {
            return;
        }
        console.log('[weekly-picks] preview load start', previewUrls[index]);
        setPreviewError((prev) => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
        setPreviewLoading((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
    }, [previewUrls]);
    const handlePreviewLoad = useCallback((index: number) => {
        console.log('[weekly-picks] preview load', previewUrls[index]);
        lastLoadedPreviewUrlRef.current[index] = previewUrls[index];
        setPreviewLoading((prev) => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
        setPreviewError((prev) => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
    }, [previewUrls]);
    const handlePreviewLoadEnd = useCallback((index: number) => {
        console.log('[weekly-picks] preview load end', previewUrls[index]);
        lastLoadedPreviewUrlRef.current[index] = previewUrls[index];
        setPreviewLoading((prev) => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
        setPreviewError((prev) => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
    }, [previewUrls]);
    const handlePreviewError = useCallback((index: number) => {
        setPreviewLoading((prev) => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
        setPreviewError((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
        console.warn('[weekly-picks] preview load failed', previewUrls[index]);
    }, [previewUrls]);
    const handleCopyShareMessage = useCallback(async () => {
        await Clipboard.setStringAsync(shareMessage);
        setCopyStatus('Copied to clipboard');
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopyStatus(null), 2000);
    }, [shareMessage]);

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

    const handleCreateBranchLink = useCallback(async () => {
        if (branchCreationInProgress) return;
        setBranchCreationError(null);
        setBranchCreationInProgress(true);
        let failedAt: 'link' | 'deep' = 'link';
        try {
            const weekLabel = getWeekRangeLabel(moment().tz(BRANCH_TZ).startOf('isoWeek').add(1, 'week'));
            const campaignName = buildWeeklyPicksCampaignName(weekLabel);
            const description = buildWeeklyPicksOgDescription(weekLabel);
            const response = await createWeeklyPicksBranchLink.mutateAsync({
                weekOffset: 1,
                title: campaignName,
                socialTitle: campaignName,
                socialDescription: description,
            });
            const link = response.link?.trim() || '';
            if (!link) {
                throw new Error('Branch quick link was not returned.');
            }
            setShareLink(link);
            const slug = extractBranchSlug(link);
            if (!slug) {
                throw new Error('Unable to extract Branch slug.');
            }
            failedAt = 'deep';
            await createWeeklyPicksDeepLink.mutateAsync({
                campaign: response.title,
                slug,
                type: 'weekly_picks',
            });
        } catch (error: any) {
            const status = error?.response?.status;
            const message = error?.response?.data?.error
                || error?.message
                || (failedAt === 'deep' ? 'Unable to create deep link.' : 'Unable to create Branch link.');
            const formatted = status ? `HTTP ${status}: ${message}` : message;
            setBranchCreationError(formatted);
            Alert.alert(failedAt === 'deep' ? 'Deep link failed' : 'Branch link failed', formatted);
            console.warn('[weekly-picks] branch link failed', error);
        } finally {
            setBranchCreationInProgress(false);
        }
    }, [branchCreationInProgress, createWeeklyPicksBranchLink, createWeeklyPicksDeepLink]);

    const handleGeneratePreview = async () => {
        if (downloadLoading || generationInProgress || branchCreationInProgress) return;
        if (!shareLink.trim()) {
            void handleCreateBranchLink();
        }
        try {
            setPreviewError([false, false]);
            setPreviewLoading([false, false]);
            setGenerationInProgress(true);
            console.log('[weekly-picks] generate start', previewUrls);
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

    const handleDownloadPreview = async (index: number) => {
        if (downloadLoading) return;
        if (previewLoading[index]) {
            Alert.alert('Preview still rendering', 'Please wait for the preview to finish loading.');
            return;
        }
        if (previewError[index]) {
            Alert.alert('Preview unavailable', 'Generate the image again before downloading.');
            return;
        }

        try {
            setDownloadLoading(true);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `weekly_picks_part_${index + 1}_${timestamp}.jpg`;
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!baseDir) {
                await Linking.openURL(previewUrls[index]);
                return;
            }
            const fileUri = `${baseDir}${fileName}`;
            const download = await FileSystem.downloadAsync(previewUrls[index], fileUri);
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(download.uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Weekly Picks',
                    UTI: 'public.jpeg',
                });
            } else {
                await Linking.openURL(previewUrls[index]);
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
                    wobbleSaveButton
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
                        <View>
                            <PreviewHeader
                                previewLoading={previewLoading}
                                downloadLoading={downloadLoading}
                                generationInProgress={generationInProgress}
                                generateBusy={generationInProgress || branchCreationInProgress}
                                generationCountdown={generationCountdown}
                                countdownLabel={countdownLabel}
                                previewSources={previewSources}
                                previewError={previewError}
                                onGenerate={handleGeneratePreview}
                                onDownload={handleDownloadPreview}
                                onLoadStart={handlePreviewLoadStart}
                                onLoad={handlePreviewLoad}
                                onLoadEnd={handlePreviewLoadEnd}
                                onError={handlePreviewError}
                            />
                            <View style={styles.copyCard}>
                                <View style={styles.copyHeaderRow}>
                                    <Text style={styles.copyTitle}>Weekly Picks Message</Text>
                                    <View style={styles.copyHeaderActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.copyButton,
                                                branchCreationInProgress && styles.copyButtonDisabled,
                                            ]}
                                            onPress={handleCreateBranchLink}
                                            disabled={branchCreationInProgress}
                                        >
                                            {branchCreationInProgress ? (
                                                <ActivityIndicator size="small" color={colors.brandIndigo} />
                                            ) : (
                                                <Ionicons name="link-outline" size={16} color={colors.brandIndigo} />
                                            )}
                                            <Text style={styles.copyButtonText}>
                                                {branchCreationInProgress ? 'Creating' : 'Create Branch Link'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.copyButton} onPress={handleCopyShareMessage}>
                                            <Ionicons name="copy-outline" size={16} color={colors.brandIndigo} />
                                            <Text style={styles.copyButtonText}>Copy</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <Text style={styles.copySubtitle}>
                                    Create the Branch link, then copy the full message.
                                </Text>
                                {branchCreationInProgress && (
                                    <View style={styles.branchStatusRow}>
                                        <ActivityIndicator size="small" color={colors.brandIndigo} />
                                        <Text style={styles.branchStatusText}>Creating Branch link...</Text>
                                    </View>
                                )}
                                {branchCreationError && (
                                    <Text style={styles.branchStatusError}>{branchCreationError}</Text>
                                )}
                                <TextInput
                                    value={shareLink}
                                    onChangeText={setShareLink}
                                    placeholder="https://l.playbuddy.me/..."
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.copyLinkInput}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <View style={styles.copyMessageBox}>
                                    <Text selectable style={styles.copyMessageText}>
                                        {shareMessage}
                                    </Text>
                                </View>
                                {copyStatus && (
                                    <Text style={styles.copyStatus}>{copyStatus}</Text>
                                )}
                            </View>
                        </View>
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
        flexWrap: 'wrap',
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
    copyCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        backgroundColor: colors.surfaceWhiteFrosted,
        ...shadows.brandCard,
    },
    copyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    copyHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    copyTitle: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.black,
        fontFamily: fontFamilies.display,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        backgroundColor: colors.surfaceWhiteStrong,
    },
    copyButtonDisabled: {
        opacity: 0.6,
    },
    copyButtonText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.black,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    copySubtitle: {
        marginBottom: spacing.sm,
        fontSize: fontSizes.sm,
        color: colors.black,
        fontFamily: fontFamilies.body,
    },
    branchStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    branchStatusText: {
        fontSize: fontSizes.sm,
        color: colors.black,
        fontFamily: fontFamilies.body,
    },
    branchStatusError: {
        marginBottom: spacing.sm,
        fontSize: fontSizes.sm,
        color: colors.danger,
        fontFamily: fontFamilies.body,
    },
    copyLinkInput: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        backgroundColor: colors.surfaceWhiteStrong,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.black,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.sm,
    },
    copyMessageBox: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        backgroundColor: colors.surfaceWhiteStrong,
        padding: spacing.sm,
    },
    copyMessageText: {
        fontSize: fontSizes.base,
        color: colors.black,
        fontFamily: fontFamilies.body,
        lineHeight: 20,
    },
    copyStatus: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.black,
        fontFamily: fontFamilies.body,
    },
    previewImageGrid: {},
    previewImageGroup: {
        marginBottom: spacing.md,
    },
    previewPartLabel: {
        marginBottom: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
        letterSpacing: 1,
        textTransform: 'uppercase',
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
