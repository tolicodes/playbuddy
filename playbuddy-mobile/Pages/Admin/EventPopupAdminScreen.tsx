import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';

import { EventPopupModal } from '../EventPopupModal';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import {
    useCreateEventPopup,
    useFetchEventPopups,
    useResendEventPopup,
    useUpdateEventPopup,
} from '../../Common/db-axios/useEventPopups';
import type { Event, EventPopup } from '../../Common/types/commonTypes';
import { formatDate } from '../Calendar/hooks/calendarUtils';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../config';
import {
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
    draft: { bg: colors.surfaceMutedAlt, text: colors.textSecondary },
    published: { bg: colors.surfaceGoldWarm, text: colors.textGold },
    stopped: { bg: colors.surfaceRoseSoft, text: colors.textBrown },
};

const formatEventLabel = (event: Event) => {
    const dateLabel = event.start_date ? formatDate(event, true) : '';
    const location = (event.neighborhood || event.city || '').trim();
    const meta = [dateLabel, location].filter(Boolean).join(' · ');
    return `${event.name}${meta ? ` — ${meta}` : ''}`;
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const EventPopupAdminScreen = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { data: events = [], isLoading: loadingEvents } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
        includeApprovalPending: true,
    });
    const { data: popups = [], isLoading: loadingPopups } = useFetchEventPopups();
    const createPopup = useCreateEventPopup();
    const resendPopup = useResendEventPopup();
    const updatePopup = useUpdateEventPopup();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [title, setTitle] = useState('');
    const [bodyMarkdown, setBodyMarkdown] = useState('');
    const [publishNow, setPublishNow] = useState(true);
    const [publishAtInput, setPublishAtInput] = useState('');
    const [expiresAtInput, setExpiresAtInput] = useState('');
    const [isEventSearchFocused, setIsEventSearchFocused] = useState(false);
    const [previewPopup, setPreviewPopup] = useState<EventPopup | null>(null);
    const eventSearchBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canPreview = title.trim().length > 0 && bodyMarkdown.trim().length > 0;

    const filteredEvents = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        if (!needle) return events.slice(0, 8);
        return events
            .filter((event) => {
                const name = (event.name || '').toLowerCase();
                const organizer = (event.organizer?.name || '').toLowerCase();
                return name.includes(needle) || organizer.includes(needle);
            })
            .slice(0, 12);
    }, [events, searchQuery]);

    const sortedPopups = useMemo(() => {
        return [...popups].sort((a, b) => {
            const left = a.published_at || a.created_at || '';
            const right = b.published_at || b.created_at || '';
            return right.localeCompare(left);
        });
    }, [popups]);

    const resetForm = () => {
        setSearchQuery('');
        setSelectedEvent(null);
        setTitle('');
        setBodyMarkdown('');
        setPublishNow(true);
        setPublishAtInput('');
        setExpiresAtInput('');
    };

    const parseDateInput = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return { value: null as string | null, error: false };
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return { value: null as string | null, error: true };
        return { value: parsed.toISOString(), error: false };
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('Add a title', 'Give the popup a title.');
            return;
        }
        if (!bodyMarkdown.trim()) {
            Alert.alert('Add a message', 'Write the popup body in markdown.');
            return;
        }

        const publishedAt = parseDateInput(publishAtInput);
        const expiresAt = parseDateInput(expiresAtInput);
        if (publishedAt.error) {
            Alert.alert('Invalid publish date', 'Use a valid date/time.');
            return;
        }
        if (expiresAt.error) {
            Alert.alert('Invalid expiration date', 'Use a valid date/time.');
            return;
        }

        try {
            await createPopup.mutateAsync({
                event_id: selectedEvent?.id,
                title: title.trim(),
                body_markdown: bodyMarkdown.trim(),
                status: publishNow ? 'published' : 'draft',
                published_at: publishNow ? publishedAt.value : undefined,
                expires_at: expiresAt.value,
            });
            resetForm();
        } catch {
            Alert.alert('Save failed', 'Unable to create popup.');
        }
    };

    const handleUpdateStatus = async (popup: EventPopup, status: 'published' | 'stopped' | 'draft') => {
        try {
            await updatePopup.mutateAsync({ id: popup.id, status });
        } catch {
            Alert.alert('Update failed', 'Could not update popup status.');
        }
    };

    const handleResendPopup = useCallback((popup: EventPopup) => {
        Alert.alert(
            'Re-send message?',
            'This will re-send the popup to all devices.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Re-send',
                    style: 'destructive',
                    onPress: () => {
                        void (async () => {
                            try {
                                await resendPopup.mutateAsync({ id: popup.id });
                                Alert.alert('Re-sent', 'The popup will reappear on all devices.');
                            } catch {
                                Alert.alert('Re-send failed', 'Unable to resend this popup.');
                            }
                        })();
                    },
                },
            ],
            { cancelable: true }
        );
    }, [resendPopup]);

    useEffect(() => () => {
        if (eventSearchBlurTimeoutRef.current) {
            clearTimeout(eventSearchBlurTimeoutRef.current);
        }
    }, []);

    const handleEventSearchFocus = useCallback(() => {
        if (eventSearchBlurTimeoutRef.current) {
            clearTimeout(eventSearchBlurTimeoutRef.current);
            eventSearchBlurTimeoutRef.current = null;
        }
        setIsEventSearchFocused(true);
    }, []);

    const handleEventSearchBlur = useCallback(() => {
        eventSearchBlurTimeoutRef.current = setTimeout(() => {
            setIsEventSearchFocused(false);
        }, 120);
    }, []);

    const showPopupPreview = useCallback((popup: EventPopup) => {
        setPreviewPopup(popup);
    }, []);

    const handlePreviewDraft = useCallback(() => {
        const nowIso = new Date().toISOString();
        const previewPopup: EventPopup = {
            id: `preview-${Date.now()}`,
            event_id: selectedEvent?.id ?? null,
            title: title.trim(),
            body_markdown: bodyMarkdown.trim(),
            status: publishNow ? 'published' : 'draft',
            created_at: nowIso,
            updated_at: nowIso,
            published_at: publishNow ? nowIso : null,
            expires_at: null,
            stopped_at: null,
            event: selectedEvent ?? undefined,
        };

        showPopupPreview(previewPopup);
    }, [bodyMarkdown, publishNow, selectedEvent, showPopupPreview, title]);

    const handlePreviewPrimaryAction = useCallback(() => {
        if (previewPopup?.event) {
            navigation.navigate('Event Details' as never, {
                selectedEvent: previewPopup.event,
                title: previewPopup.event.name,
            } as never);
        }
        setPreviewPopup(null);
    }, [navigation, previewPopup]);

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <FAIcon name="user-lock" size={22} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        This space is reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <LinearGradient
                colors={['#1F0B3F', '#6B2BD4', '#FF6FA0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
            >
                <Text style={styles.heroKicker}>Message Popups</Text>
                <Text style={styles.heroTitle}>Special messages</Text>
                <Text style={styles.heroSubtitle}>
                    Craft a beautiful popup with an optional event link, then publish it when you want it to land.
                </Text>
            </LinearGradient>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Create popup</Text>
                <View style={styles.card}>
                    <Text style={styles.fieldLabel}>Event (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            if (selectedEvent && text !== selectedEvent.name) {
                                setSelectedEvent(null);
                            }
                        }}
                        onFocus={handleEventSearchFocus}
                        onBlur={handleEventSearchBlur}
                        placeholder="Search events"
                        placeholderTextColor={colors.textSubtle}
                    />
                    {isEventSearchFocused && (
                        loadingEvents ? (
                            <ActivityIndicator color={colors.brandIndigo} style={styles.loader} />
                        ) : (
                            <View style={styles.resultsList}>
                                {filteredEvents.map((event) => (
                                    <TouchableOpacity
                                        key={event.id}
                                        style={styles.resultRow}
                                        onPress={() => {
                                            setSelectedEvent(event);
                                            setSearchQuery(event.name || '');
                                            setIsEventSearchFocused(false);
                                        }}
                                    >
                                        <Text style={styles.resultTitle} numberOfLines={2}>
                                            {formatEventLabel(event)}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )
                    )}

                    {selectedEvent && (
                        <View style={styles.selectedCard}>
                            <Text style={styles.selectedLabel}>Selected event</Text>
                            <Text style={styles.selectedTitle}>{selectedEvent.name}</Text>
                            <Text style={styles.selectedMeta}>{formatEventLabel(selectedEvent)}</Text>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => {
                                    setSelectedEvent(null);
                                    setSearchQuery('');
                                }}
                            >
                                <Text style={styles.clearButtonText}>Remove event</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.fieldLabel}>Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Popup headline"
                        placeholderTextColor={colors.textSubtle}
                    />

                    <Text style={styles.fieldLabel}>Body (markdown)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={bodyMarkdown}
                        onChangeText={setBodyMarkdown}
                        placeholder="Write the popup message"
                        placeholderTextColor={colors.textSubtle}
                        multiline
                    />

                    <Text style={styles.fieldLabel}>Publish at (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={publishAtInput}
                        onChangeText={setPublishAtInput}
                        placeholder="2024-01-31T18:00:00Z"
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                    />

                    <Text style={styles.fieldLabel}>Expires at (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={expiresAtInput}
                        onChangeText={setExpiresAtInput}
                        placeholder="2024-02-01T18:00:00Z"
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={[styles.toggleRow, publishNow && styles.toggleRowActive]}
                        onPress={() => setPublishNow((prev) => !prev)}
                    >
                        <View style={styles.toggleIcon}>
                            <FAIcon name={publishNow ? 'bolt' : 'save'} size={14} color={publishNow ? colors.brandMagenta : colors.textMuted} />
                        </View>
                        <Text style={styles.toggleText}>
                            {publishNow ? 'Publish immediately' : 'Save as draft'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, createPopup.isPending && styles.primaryButtonDisabled]}
                        onPress={handleCreate}
                        disabled={createPopup.isPending}
                    >
                        <Text style={styles.primaryButtonText}>
                            {createPopup.isPending ? 'Saving…' : 'Create popup'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.secondaryButton, !canPreview && styles.secondaryButtonDisabled]}
                        onPress={handlePreviewDraft}
                        disabled={!canPreview}
                    >
                        <Text style={styles.secondaryButtonText}>Preview popup</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past popups</Text>
                {loadingPopups ? (
                    <ActivityIndicator color={colors.brandIndigo} />
                ) : (
                    <View style={styles.list}>
                        {sortedPopups.map((popup) => {
                            const tone = STATUS_TONE[popup.status] || STATUS_TONE.draft;
                            return (
                                <View key={popup.id} style={styles.popupCard}>
                                    <View style={styles.popupHeader}>
                                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                                            <Text style={[styles.statusText, { color: tone.text }]}>{popup.status}</Text>
                                        </View>
                                        <Text style={styles.popupEvent} numberOfLines={2}>
                                            {popup.event?.name || (popup.event_id ? `Event #${popup.event_id}` : 'Message only')}
                                        </Text>
                                    </View>
                                    <Text style={styles.popupTitle}>{popup.title}</Text>
                                    <Text style={styles.popupMeta}>Published: {formatDateTime(popup.published_at)}</Text>
                                    <Text style={styles.popupMeta}>Expires: {formatDateTime(popup.expires_at)}</Text>
                                    <Text style={styles.popupMeta}>Stopped: {formatDateTime(popup.stopped_at)}</Text>
                                    <View style={styles.popupActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => showPopupPreview(popup)}
                                        >
                                            <Text style={styles.actionButtonText}>Preview</Text>
                                        </TouchableOpacity>
                                        {(popup.status === 'published' || popup.status === 'stopped') && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleResendPopup(popup)}
                                                disabled={resendPopup.isPending}
                                            >
                                                <Text style={styles.actionButtonText}>Re-send</Text>
                                            </TouchableOpacity>
                                        )}
                                        {popup.status === 'draft' && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleUpdateStatus(popup, 'published')}
                                            >
                                                <Text style={styles.actionButtonText}>Publish</Text>
                                            </TouchableOpacity>
                                        )}
                                        {popup.status === 'published' && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.stopButton]}
                                                onPress={() => handleUpdateStatus(popup, 'stopped')}
                                            >
                                                <Text style={[styles.actionButtonText, styles.stopButtonText]}>Stop</Text>
                                            </TouchableOpacity>
                                        )}
                                        {popup.status === 'stopped' && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleUpdateStatus(popup, 'published')}
                                            >
                                                <Text style={styles.actionButtonText}>Republish</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                        {sortedPopups.length === 0 && (
                            <Text style={styles.emptyText}>No popups yet.</Text>
                        )}
                    </View>
                )}
            </View>
            <EventPopupModal
                visible={!!previewPopup}
                popup={previewPopup}
                onDismiss={() => setPreviewPopup(null)}
                onPrimaryAction={handlePreviewPrimaryAction}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    heroCard: {
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lgPlus,
        ...shadows.brandCard,
    },
    heroKicker: {
        fontSize: fontSizes.sm,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: colors.textOnDarkSubtle,
        fontFamily: fontFamilies.body,
    },
    heroTitle: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.white,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.display,
    },
    heroSubtitle: {
        fontSize: fontSizes.base,
        color: colors.textOnDarkMuted,
        marginTop: spacing.sm,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        maxWidth: 280,
    },
    section: {
        marginBottom: spacing.lgPlus,
    },
    sectionTitle: {
        fontSize: fontSizes.sm,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: 4,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    card: {
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadows.card,
    },
    fieldLabel: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.borderMuted,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.smPlus,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceWhiteOpaque,
        fontFamily: fontFamilies.body,
    },
    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    resultsList: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        overflow: 'hidden',
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderMutedLight,
    },
    resultTitle: {
        flex: 1,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        marginRight: spacing.sm,
    },
    selectedCard: {
        backgroundColor: colors.surfaceLavenderLight,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavender,
    },
    selectedLabel: {
        fontSize: fontSizes.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.textLavenderMuted,
        fontFamily: fontFamilies.body,
    },
    selectedTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textDeep,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.display,
    },
    selectedMeta: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    clearButton: {
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceWhiteStrong,
    },
    clearButtonText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.brandIndigo,
        fontFamily: fontFamilies.body,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.md,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
    },
    toggleRowActive: {
        borderColor: colors.borderLavenderStrong,
        backgroundColor: colors.surfaceLavenderAlt,
    },
    toggleIcon: {
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceLavenderLight,
    },
    toggleText: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    primaryButton: {
        marginTop: spacing.sm,
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    secondaryButton: {
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        backgroundColor: colors.surfaceWhiteOpaque,
    },
    secondaryButtonDisabled: {
        opacity: 0.6,
    },
    secondaryButtonText: {
        color: colors.textSecondary,
        fontSize: fontSizes.base,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    list: {
        gap: spacing.md,
    },
    popupCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    popupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusPill: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
    },
    statusText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        textTransform: 'capitalize',
        fontFamily: fontFamilies.body,
    },
    popupEvent: {
        flex: 1,
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    popupTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textDeep,
        marginTop: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    popupMeta: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    popupActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    actionButton: {
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavender,
    },
    actionButtonText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.brandIndigo,
        fontFamily: fontFamilies.body,
    },
    stopButton: {
        backgroundColor: colors.surfaceRoseSoft,
        borderColor: colors.borderRose,
    },
    stopButtonText: {
        color: colors.textBrown,
    },
    emptyText: {
        fontSize: fontSizes.base,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
        padding: spacing.md,
    },
    loader: {
        marginVertical: spacing.sm,
    },
    lockedCard: {
        margin: spacing.xl,
        padding: spacing.xl,
        borderRadius: radius.lg,
        backgroundColor: colors.white,
        alignItems: 'center',
        ...shadows.card,
    },
    lockedIcon: {
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceMutedAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    lockedTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textDeep,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.xs,
    },
    lockedText: {
        fontSize: fontSizes.base,
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
});

export default EventPopupAdminScreen;
