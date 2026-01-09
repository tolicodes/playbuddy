import React, { useMemo, useState } from 'react';
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

import { useFetchEvents } from '../../Common/db-axios/useEvents';
import {
    useCreatePushNotification,
    useFetchPushNotifications,
    useFlushPushNotifications,
    useSendPushNotification,
    useUpdatePushNotification,
} from '../../Common/db-axios/usePushNotifications';
import { getOrganizerNotificationPreview } from '../../Common/notifications/organizerPushNotifications';
import type { Event, PushNotification, PushNotificationStatus } from '../../Common/types/commonTypes';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../config';
import { formatDate } from '../Calendar/hooks/calendarUtils';
import {
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

type SendMode = 'now' | 'scheduled' | 'draft';

const STATUS_TONE: Record<PushNotificationStatus, { bg: string; text: string }> = {
    draft: { bg: colors.surfaceMutedAlt, text: colors.textSecondary },
    scheduled: { bg: colors.surfaceInfo, text: colors.brandBlue },
    sending: { bg: colors.surfaceInfoStrong, text: colors.brandBlue },
    sent: { bg: colors.surfaceGoldWarm, text: colors.textGold },
    failed: { bg: colors.surfaceRoseSoft, text: colors.textBrown },
    canceled: { bg: colors.surfaceWarning, text: colors.textGoldMuted },
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatBodyPreview = (value: string, maxLength = 70) => {
    const trimmed = value.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength)}...`;
};

const parseDateInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { value: null as string | null, error: false };
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return { value: null as string | null, error: true };
    return { value: parsed.toISOString(), error: false };
};

const formatEventLabel = (event: Event) => {
    const dateLabel = event.start_date ? formatDate(event, true) : '';
    const location = (event.neighborhood || event.city || '').trim();
    const meta = [dateLabel, location].filter(Boolean).join(' · ');
    return `${event.name}${meta ? ` — ${meta}` : ''}`;
};

const sendModeOptions: { key: SendMode; title: string; subtitle: string; icon: string }[] = [
    { key: 'now', title: 'Send now', subtitle: 'Deliver immediately', icon: 'bolt' },
    { key: 'scheduled', title: 'Schedule', subtitle: 'Pick a future send time', icon: 'clock' },
    { key: 'draft', title: 'Draft', subtitle: 'Save without sending', icon: 'save' },
];

export const PushNotificationsAdminScreen = () => {
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { data: events = [], isLoading: loadingEvents } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
        includeApprovalPending: true,
    });
    const { data: notifications = [], isLoading } = useFetchPushNotifications();
    const createNotification = useCreatePushNotification();
    const updateNotification = useUpdatePushNotification();
    const sendNotification = useSendPushNotification();
    const flushScheduled = useFlushPushNotifications();

    const [editing, setEditing] = useState<PushNotification | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [sendMode, setSendMode] = useState<SendMode>('now');
    const [sendAtInput, setSendAtInput] = useState('');

    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => {
            const left = a.send_at || a.created_at || '';
            const right = b.send_at || b.created_at || '';
            return right.localeCompare(left);
        });
    }, [notifications]);

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

    const eventMap = useMemo(() => {
        return new Map(events.map((event) => [event.id, event]));
    }, [events]);

    const resetForm = () => {
        setEditing(null);
        setSearchQuery('');
        setSelectedEvent(null);
        setSelectedEventId(null);
        setTitle('');
        setBody('');
        setImageUrl('');
        setSendMode('now');
        setSendAtInput('');
    };

    const isEditable = (status: PushNotificationStatus) =>
        status === 'draft' || status === 'scheduled' || status === 'failed';

    const handleEdit = (notification: PushNotification) => {
        const matchedEvent = notification.event_id ? eventMap.get(notification.event_id) ?? null : null;
        setEditing(notification);
        setSelectedEvent(matchedEvent);
        setSelectedEventId(notification.event_id ?? null);
        setSearchQuery(matchedEvent?.name || '');
        setTitle(notification.title || '');
        setBody(notification.body || '');
        setImageUrl(notification.image_url || '');
        if (notification.status === 'scheduled') {
            setSendMode('scheduled');
        } else if (notification.status === 'draft') {
            setSendMode('draft');
        } else {
            setSendMode('now');
        }
        setSendAtInput(notification.send_at || '');
    };

    const handleSelectEvent = (event: Event) => {
        setSelectedEvent(event);
        setSelectedEventId(event.id);
        setSearchQuery(event.name || '');
        const preview = getOrganizerNotificationPreview(event);
        setTitle(preview.title);
        setBody(preview.body);
        setImageUrl(preview.imageUrl || '');
    };

    const handleFlush = async () => {
        try {
            const result = await flushScheduled.mutateAsync();
            Alert.alert(
                'Flush complete',
                `Processed ${result.processed} notification(s). Failed: ${result.failed}.`
            );
        } catch {
            Alert.alert('Flush failed', 'Unable to process scheduled notifications.');
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Add a title', 'Give the notification a title.');
            return;
        }
        if (!body.trim()) {
            Alert.alert('Add a message', 'Write the notification body.');
            return;
        }

        const sendAt = parseDateInput(sendAtInput);
        if (sendMode === 'scheduled' && (sendAt.error || !sendAt.value)) {
            Alert.alert('Invalid send date', 'Use a valid send time.');
            return;
        }

        const payload = {
            title: title.trim(),
            body: body.trim(),
            image_url: imageUrl.trim() ? imageUrl.trim() : null,
            event_id: selectedEventId,
        };

        try {
            if (editing) {
                const updates: Record<string, any> = { ...payload };
                if (sendMode === 'draft') {
                    updates.status = 'draft';
                    updates.send_at = null;
                } else if (sendMode === 'scheduled') {
                    updates.status = 'scheduled';
                    updates.send_at = sendAt.value;
                } else {
                    updates.status = 'draft';
                    updates.send_at = null;
                }

                const updated = await updateNotification.mutateAsync({ id: editing.id, ...updates });
                if (sendMode === 'now') {
                    await sendNotification.mutateAsync({ id: updated.id });
                }
                resetForm();
                return;
            }

            if (sendMode === 'scheduled') {
                await createNotification.mutateAsync({
                    ...payload,
                    status: 'scheduled',
                    send_at: sendAt.value,
                });
            } else if (sendMode === 'draft') {
                await createNotification.mutateAsync({
                    ...payload,
                    status: 'draft',
                });
            } else {
                const created = await createNotification.mutateAsync({
                    ...payload,
                    status: 'draft',
                });
                await sendNotification.mutateAsync({ id: created.id });
            }

            resetForm();
        } catch {
            Alert.alert('Save failed', 'Unable to create notification.');
        }
    };

    const handleSendNow = async (notification: PushNotification) => {
        try {
            await sendNotification.mutateAsync({ id: notification.id });
        } catch {
            Alert.alert('Send failed', 'Unable to send this notification.');
        }
    };

    const handleCancel = async (notification: PushNotification) => {
        try {
            await updateNotification.mutateAsync({ id: notification.id, status: 'canceled' });
        } catch {
            Alert.alert('Update failed', 'Unable to cancel this notification.');
        }
    };

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

    const isSaving =
        createNotification.isPending ||
        updateNotification.isPending ||
        sendNotification.isPending;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <LinearGradient
                colors={['#0B153F', '#2F6FE4', '#59BFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
            >
                <Text style={styles.heroKicker}>Push Notifications</Text>
                <Text style={styles.heroTitle}>Broadcast to mobile</Text>
                <Text style={styles.heroSubtitle}>
                    Compose a remote push, schedule it, or deliver now to active devices.
                </Text>
                <TouchableOpacity style={styles.flushButton} onPress={handleFlush}>
                    <Ionicons name="refresh" size={16} color={colors.white} />
                    <Text style={styles.flushButtonText}>
                        {flushScheduled.isPending ? 'Flushing...' : 'Flush scheduled'}
                    </Text>
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    {editing ? 'Edit notification' : 'Create notification'}
                </Text>
                <View style={styles.card}>
                    <Text style={styles.fieldLabel}>Attach event (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            if (selectedEvent && text !== selectedEvent.name) {
                                setSelectedEvent(null);
                                setSelectedEventId(null);
                            }
                        }}
                        placeholder="Search events"
                        placeholderTextColor={colors.textSubtle}
                    />
                    {loadingEvents ? (
                        <ActivityIndicator color={colors.brandBlue} style={styles.loader} />
                    ) : (
                        <View style={styles.resultsList}>
                            {filteredEvents.map((event) => (
                                <TouchableOpacity
                                    key={event.id}
                                    style={styles.resultRow}
                                    onPress={() => handleSelectEvent(event)}
                                >
                                    <Text style={styles.resultTitle} numberOfLines={2}>
                                        {formatEventLabel(event)}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {selectedEventId && (
                        <View style={styles.selectedCard}>
                            <Text style={styles.selectedLabel}>Selected event</Text>
                            <Text style={styles.selectedTitle}>
                                {selectedEvent?.name || `Event #${selectedEventId}`}
                            </Text>
                            {selectedEvent ? (
                                <Text style={styles.selectedMeta}>{formatEventLabel(selectedEvent)}</Text>
                            ) : null}
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => {
                                    setSelectedEvent(null);
                                    setSelectedEventId(null);
                                    setSearchQuery('');
                                }}
                            >
                                <Text style={styles.clearButtonText}>Change event</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.fieldLabel}>Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Title"
                        placeholderTextColor={colors.textSubtle}
                    />

                    <Text style={styles.fieldLabel}>Body</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={body}
                        onChangeText={setBody}
                        placeholder="Write the message"
                        placeholderTextColor={colors.textSubtle}
                        multiline
                    />

                    <Text style={styles.fieldLabel}>Image URL (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={imageUrl}
                        onChangeText={setImageUrl}
                        placeholder="https://..."
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                    />

                    <Text style={styles.fieldLabel}>Send mode</Text>
                    <View style={styles.modeList}>
                        {sendModeOptions.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.modeRow,
                                    sendMode === option.key && styles.modeRowActive,
                                ]}
                                onPress={() => setSendMode(option.key)}
                            >
                                <View style={styles.modeIcon}>
                                    <FAIcon
                                        name={option.icon}
                                        size={14}
                                        color={sendMode === option.key ? colors.brandBlue : colors.textMuted}
                                    />
                                </View>
                                <View style={styles.modeBody}>
                                    <Text style={styles.modeTitle}>{option.title}</Text>
                                    <Text style={styles.modeSubtitle}>{option.subtitle}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {sendMode === 'scheduled' && (
                        <>
                            <Text style={styles.fieldLabel}>Send at (ISO datetime)</Text>
                            <TextInput
                                style={styles.input}
                                value={sendAtInput}
                                onChangeText={setSendAtInput}
                                placeholder="2024-01-31T18:00:00Z"
                                placeholderTextColor={colors.textSubtle}
                                autoCapitalize="none"
                            />
                        </>
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSaving}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isSaving ? 'Saving...' : editing ? 'Save notification' : 'Create notification'}
                            </Text>
                        </TouchableOpacity>
                        {editing && (
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={resetForm}
                            >
                                <Text style={styles.secondaryButtonText}>Cancel edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent notifications</Text>
                {isLoading ? (
                    <ActivityIndicator color={colors.brandBlue} />
                ) : (
                    <View style={styles.list}>
                        {sortedNotifications.map((notification) => {
                            const tone = STATUS_TONE[notification.status] || STATUS_TONE.draft;
                            const linkedEvent = notification.event_id
                                ? eventMap.get(notification.event_id) ?? null
                                : null;
                            return (
                                <View key={notification.id} style={styles.notificationCard}>
                                    <View style={styles.notificationHeader}>
                                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                                            <Text style={[styles.statusText, { color: tone.text }]}>
                                                {notification.status}
                                            </Text>
                                        </View>
                                        <Text style={styles.notificationTitle} numberOfLines={1}>
                                            {notification.title}
                                        </Text>
                                    </View>
                                    <Text style={styles.notificationBody}>
                                        {formatBodyPreview(notification.body)}
                                    </Text>
                                    {notification.event_id ? (
                                        <Text style={styles.notificationMeta}>
                                            Event:{' '}
                                            {linkedEvent
                                                ? formatEventLabel(linkedEvent)
                                                : `#${notification.event_id}`}
                                        </Text>
                                    ) : null}
                                    <Text style={styles.notificationMeta}>
                                        Send at: {formatDateTime(notification.send_at)}
                                    </Text>
                                    <Text style={styles.notificationMeta}>
                                        Sent at: {formatDateTime(notification.sent_at)}
                                    </Text>
                                    <Text style={styles.notificationMeta}>
                                        Sent: {notification.sent_count ?? 0} | Failed: {notification.failed_count ?? 0}
                                    </Text>
                                    {notification.last_error ? (
                                        <Text style={styles.notificationError}>
                                            Last error: {notification.last_error}
                                        </Text>
                                    ) : null}
                                    <View style={styles.notificationActions}>
                                        {isEditable(notification.status) && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleEdit(notification)}
                                            >
                                                <Text style={styles.actionButtonText}>Edit</Text>
                                            </TouchableOpacity>
                                        )}
                                        {isEditable(notification.status) && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.sendButton]}
                                                onPress={() => handleSendNow(notification)}
                                            >
                                                <Text style={[styles.actionButtonText, styles.sendButtonText]}>
                                                    Send now
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {notification.status === 'scheduled' && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.cancelButton]}
                                                onPress={() => handleCancel(notification)}
                                            >
                                                <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
                                                    Cancel
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                        {sortedNotifications.length === 0 && (
                            <Text style={styles.emptyText}>No push notifications yet.</Text>
                        )}
                    </View>
                )}
            </View>
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
    flushButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        marginTop: spacing.md,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    flushButtonText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
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
    loader: {
        marginVertical: spacing.sm,
    },
    modeList: {
        gap: spacing.sm,
    },
    modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.md,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        backgroundColor: colors.surfaceWhiteSoft,
    },
    modeRowActive: {
        borderColor: colors.accentBlueBorder,
        backgroundColor: colors.surfaceInfo,
    },
    modeIcon: {
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceWhiteStrong,
    },
    modeBody: {
        flex: 1,
    },
    modeTitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    modeSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    primaryButton: {
        flexGrow: 1,
        backgroundColor: colors.brandBlue,
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
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceWhiteStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
    },
    list: {
        gap: spacing.md,
    },
    notificationCard: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    notificationHeader: {
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
    notificationTitle: {
        flex: 1,
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    notificationBody: {
        fontSize: fontSizes.base,
        color: colors.textDeep,
        marginTop: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    notificationMeta: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    notificationError: {
        fontSize: fontSizes.sm,
        color: colors.textBrown,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    notificationActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
    sendButton: {
        backgroundColor: colors.surfaceInfo,
        borderColor: colors.accentBlueBorder,
    },
    sendButtonText: {
        color: colors.brandBlue,
    },
    cancelButton: {
        backgroundColor: colors.surfaceWarning,
        borderColor: colors.surfaceGoldMuted,
    },
    cancelButtonText: {
        color: colors.textGoldMuted,
    },
    emptyText: {
        fontSize: fontSizes.base,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
        padding: spacing.md,
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

export default PushNotificationsAdminScreen;
