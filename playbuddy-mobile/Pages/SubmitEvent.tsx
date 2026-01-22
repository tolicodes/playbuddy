import React, { useMemo, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';

import { useCreateEventSubmission, useCreateEventSubmissionFromUrl } from '../Common/db-axios/useEventSubmissions';
import { useUserContext } from './Auth/hooks/UserContext';
import { useGuestSaveModal } from './GuestSaveModal';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../components/styles';
import type { Attendee, Event } from '../commonTypes';
import type { EventWithMetadata } from '../Common/Nav/NavStackType';
import { EventListItem } from './Calendar/ListView/EventListItem';
import { supabase } from '../supabaseClient';

const isValidUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);
const emptyAttendees: Attendee[] = [];

const formatDateTimeDisplay = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const toValidDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

export const SubmitEvent = () => {
    const { authUserId } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const submitFromUrl = useCreateEventSubmissionFromUrl();
    const submitManual = useCreateEventSubmission();

    const [url, setUrl] = useState('');
    const [previewEvents, setPreviewEvents] = useState<Event[]>([]);
    const [previewNote, setPreviewNote] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);
    const [eventName, setEventName] = useState('');
    const [organizerName, setOrganizerName] = useState('');
    const [organizerUrl, setOrganizerUrl] = useState('');
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [location, setLocation] = useState('');
    const [city, setCity] = useState('');
    const [region, setRegion] = useState('');
    const [ticketUrl, setTicketUrl] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

    const isLocked = !authUserId;

    const trimmedUrl = useMemo(() => url.trim(), [url]);
    const isUrlReady = trimmedUrl.length > 0 && isValidUrl(trimmedUrl);

    const resetUrlPreview = () => {
        setPreviewEvents([]);
        setPreviewNote(null);
        setPreviewError(null);
    };

    const resetManualForm = () => {
        setEventName('');
        setOrganizerName('');
        setOrganizerUrl('');
        setStartDate(null);
        setEndDate(null);
        setLocation('');
        setCity('');
        setRegion('');
        setTicketUrl('');
        setPrice('');
        setDescription('');
        setImageUri(null);
        setUploadedImageUrl(null);
        setIsUploadingImage(false);
        setImageUploadError(null);
        setActivePicker(null);
    };

    const handlePickImage = async () => {
        if (isLocked) {
            showGuestSaveModal({
                title: 'Create an account to submit events',
                message: 'Upload images and submit events to the community.',
                iconName: 'image',
            });
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow photo access to upload an image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.9,
        });

        if (result.canceled) return;

        const asset = result.assets?.[0];
        if (!asset?.uri) return;

        setImageUri(asset.uri);
        setUploadedImageUrl(null);
        setImageUploadError(null);
        setIsUploadingImage(true);

        try {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const randomUUID = uuidv4();
            const fileName = `public/${randomUUID}.jpg`;

            const { error } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, { contentType: blob.type });

            if (error) {
                throw error;
            }

            const { data } = await supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setUploadedImageUrl(data?.publicUrl ?? null);
        } catch (err: any) {
            setImageUploadError(err?.message || 'Image upload failed.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleSubmitUrl = async () => {
        if (isLocked) {
            showGuestSaveModal({
                title: 'Create an account to submit events',
                message: 'Submit links and share events with the community.',
                iconName: 'calendar-plus',
            });
            return;
        }
        if (!isUrlReady) {
            Alert.alert('Invalid link', 'Paste a valid event link to continue.');
            return;
        }

        try {
            resetUrlPreview();
            const response = await submitFromUrl.mutateAsync({ url: trimmedUrl });
            const scrapedCount = response?.scraped ?? 0;
            const responseEvents = Array.isArray(response?.events) ? response.events : [];
            const importedEvents = responseEvents
                .map((row: any) => row?.event)
                .filter(Boolean) as Event[];
            setPreviewEvents(importedEvents);
            if (!importedEvents.length) {
                if (scrapedCount > 0 || responseEvents.length > 0) {
                    setPreviewNote('Event saved for review.');
                } else {
                    setPreviewNote('Thanks for the link. We will review it manually.');
                }
            } else if (scrapedCount > 1 || importedEvents.length > 1) {
                const countLabel = scrapedCount || importedEvents.length;
                setPreviewNote(`We found ${countLabel} events. Here is a preview.`);
            }
            Alert.alert(
                'Thanks!',
                scrapedCount > 0
                    ? 'We pulled the details and sent it for review.'
                    : 'Thanks for the link. We will take a look and follow up.'
            );
            setUrl('');
        } catch (err: any) {
            setPreviewError(err?.message || 'Please try again.');
            Alert.alert('Submission failed', err?.message || 'Please try again.');
        }
    };

    const handleSubmitManual = async () => {
        if (isLocked) {
            showGuestSaveModal({
                title: 'Create an account to submit events',
                message: 'Submit events and keep the community updated.',
                iconName: 'calendar-plus',
            });
            return;
        }

        const missingFields = [];
        if (!eventName.trim()) missingFields.push('Event name');
        if (!organizerName.trim()) missingFields.push('Organizer name');
        if (!startDate) missingFields.push('Start date');
        if (!location.trim()) missingFields.push('Location');
        if (!description.trim()) missingFields.push('Description');

        if (missingFields.length) {
            Alert.alert('Missing details', `Please add: ${missingFields.join(', ')}.`);
            return;
        }

        if (isUploadingImage) {
            Alert.alert('Image uploading', 'Please wait for the image upload to finish.');
            return;
        }

        try {
            await submitManual.mutateAsync({
                name: eventName.trim(),
                organizer_name: organizerName.trim(),
                organizer_url: organizerUrl.trim() || undefined,
                start_date: startDate!,
                end_date: endDate || undefined,
                ticket_url: ticketUrl.trim() || undefined,
                image_url: uploadedImageUrl || undefined,
                location: location.trim(),
                city: city.trim() || undefined,
                region: region.trim() || undefined,
                price: price.trim() || undefined,
                description: description.trim(),
            });
            Alert.alert('Submitted', 'Thanks! We will review your event soon.');
            resetManualForm();
        } catch (err: any) {
            Alert.alert('Submission failed', err?.message || 'Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <FAIcon name="plus-circle" size={20} color={colors.brandIndigo} />
                    </View>
                    <Text style={styles.heroTitle}>Add your event</Text>
                    <Text style={styles.heroSubtitle}>
                        Submit a link or enter the details. We will review before publishing.
                    </Text>
                </View>

                {isLocked && (
                    <View style={styles.noticeCard}>
                        <Text style={styles.noticeTitle}>Sign in to submit</Text>
                        <Text style={styles.noticeBody}>
                            Create an account or sign in to share events with the community.
                        </Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Have a link already?</Text>
                    <Text style={styles.sectionBody}>
                        We will try to pull the details for you.
                    </Text>
                    <TextInput
                        value={url}
                        onChangeText={(value) => {
                            setUrl(value);
                            if (previewEvents.length || previewNote || previewError) {
                                resetUrlPreview();
                            }
                        }}
                        placeholder="https://"
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        style={styles.input}
                    />
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            (submitFromUrl.isPending || !isUrlReady || isLocked) && styles.primaryButtonDisabled,
                        ]}
                        onPress={handleSubmitUrl}
                        disabled={submitFromUrl.isPending || !isUrlReady || isLocked}
                    >
                        <Text style={styles.primaryButtonText}>
                            {submitFromUrl.isPending ? 'Submitting...' : 'Import link'}
                        </Text>
                    </TouchableOpacity>
                    {(previewNote || previewError) && (
                        <View style={styles.previewNotice}>
                            <Text style={[
                                styles.previewNoteText,
                                previewError && styles.previewErrorText,
                            ]}
                            >
                                {previewError || previewNote}
                            </Text>
                        </View>
                    )}
                    {!!previewEvents.length && (
                        <View style={styles.previewList}>
                            <Text style={styles.previewTitle}>Event preview</Text>
                            {previewEvents.map((event, index) => {
                                const previewDescription = (event.description || event.short_description || '').trim();
                                const footerContent = previewDescription ? (
                                    <View style={styles.previewFooter}>
                                        <Text style={styles.previewDescription} numberOfLines={4}>
                                            {previewDescription}
                                        </Text>
                                    </View>
                                ) : undefined;
                                return (
                                    <View key={`${event.id ?? 'preview'}-${index}`} style={styles.previewCardWrap}>
                                        <EventListItem
                                            item={event as EventWithMetadata}
                                            onPress={() => null}
                                            attendees={emptyAttendees}
                                            autoHeight
                                            listViewMode="image"
                                            hideSaveButton
                                            disableClickAnalytics
                                            footerContent={footerContent}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Enter manually</Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>Event name</Text>
                        <TextInput
                            value={eventName}
                            onChangeText={setEventName}
                            placeholder="Event name"
                            placeholderTextColor={colors.textSubtle}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Organizer name</Text>
                        <TextInput
                            value={organizerName}
                            onChangeText={setOrganizerName}
                            placeholder="Organizer"
                            placeholderTextColor={colors.textSubtle}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Organizer website</Text>
                        <TextInput
                            value={organizerUrl}
                            onChangeText={setOrganizerUrl}
                            placeholder="https://"
                            placeholderTextColor={colors.textSubtle}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Event image</Text>
                        <TouchableOpacity
                            style={styles.imageUpload}
                            onPress={handlePickImage}
                            disabled={isLocked || isUploadingImage}
                            activeOpacity={0.8}
                        >
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <FAIcon name="image" size={18} color={colors.textMuted} />
                                </View>
                            )}
                            <View style={styles.imageOverlay}>
                                {isUploadingImage ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.imageOverlayText}>
                                        {uploadedImageUrl ? 'Change image' : 'Upload image'}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                        {imageUploadError && (
                            <Text style={styles.imageErrorText}>{imageUploadError}</Text>
                        )}
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldCol}>
                            <Text style={styles.label}>Start date</Text>
                            <TouchableOpacity
                                style={styles.inputPressable}
                                onPress={() => setActivePicker('start')}
                                activeOpacity={0.8}
                            >
                                <TextInput
                                    style={styles.input}
                                    value={formatDateTimeDisplay(startDate)}
                                    placeholder="Select start date"
                                    placeholderTextColor={colors.textSubtle}
                                    editable={false}
                                    pointerEvents="none"
                                />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.fieldCol}>
                            <Text style={styles.label}>End date</Text>
                            <TouchableOpacity
                                style={styles.inputPressable}
                                onPress={() => setActivePicker('end')}
                                activeOpacity={0.8}
                            >
                                <TextInput
                                    style={styles.input}
                                    value={formatDateTimeDisplay(endDate)}
                                    placeholder="Optional"
                                    placeholderTextColor={colors.textSubtle}
                                    editable={false}
                                    pointerEvents="none"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {activePicker && (
                        <View style={styles.pickerCard}>
                            <DateTimePicker
                                value={
                                    activePicker === 'end'
                                        ? toValidDate(endDate) ?? toValidDate(startDate) ?? new Date()
                                        : toValidDate(startDate) ?? new Date()
                                }
                                mode="datetime"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_, date) => {
                                    if (date) {
                                        if (activePicker === 'start') {
                                            setStartDate(date.toISOString());
                                        } else {
                                            setEndDate(date.toISOString());
                                        }
                                    }
                                    if (Platform.OS !== 'ios') {
                                        setActivePicker(null);
                                    }
                                }}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.pickerDoneButton}
                                    onPress={() => setActivePicker(null)}
                                >
                                    <Text style={styles.pickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <View style={styles.field}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Venue name or address"
                            placeholderTextColor={colors.textSubtle}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldCol}>
                            <Text style={styles.label}>City</Text>
                            <TextInput
                                value={city}
                                onChangeText={setCity}
                                placeholder="City"
                                placeholderTextColor={colors.textSubtle}
                                style={styles.input}
                            />
                        </View>
                        <View style={styles.fieldCol}>
                            <Text style={styles.label}>Region</Text>
                            <TextInput
                                value={region}
                                onChangeText={setRegion}
                                placeholder="State/Region"
                                placeholderTextColor={colors.textSubtle}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Ticket URL</Text>
                        <TextInput
                            value={ticketUrl}
                            onChangeText={setTicketUrl}
                            placeholder="https://"
                            placeholderTextColor={colors.textSubtle}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Price</Text>
                        <TextInput
                            value={price}
                            onChangeText={setPrice}
                            placeholder="$"
                            placeholderTextColor={colors.textSubtle}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Share a few details about the event"
                            placeholderTextColor={colors.textSubtle}
                            style={styles.textArea}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            (submitManual.isPending || isLocked || isUploadingImage) && styles.primaryButtonDisabled,
                        ]}
                        onPress={handleSubmitManual}
                        disabled={submitManual.isPending || isLocked || isUploadingImage}
                    >
                        <Text style={styles.primaryButtonText}>
                            {submitManual.isPending ? 'Submitting...' : 'Submit event'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
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
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surfaceLavenderAlt,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        marginBottom: spacing.lgPlus,
        ...shadows.card,
    },
    heroIcon: {
        width: 42,
        height: 42,
        borderRadius: radius.md,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    heroTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    heroSubtitle: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        lineHeight: 20,
        fontFamily: fontFamilies.body,
    },
    noticeCard: {
        borderRadius: radius.md,
        padding: spacing.mdPlus,
        backgroundColor: colors.surfaceWarning,
        borderWidth: 1,
        borderColor: colors.borderGoldSoft,
        marginBottom: spacing.lgPlus,
    },
    noticeTitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    noticeBody: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        lineHeight: 18,
        fontFamily: fontFamilies.body,
    },
    card: {
        borderRadius: radius.md,
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    sectionBody: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        lineHeight: 20,
        marginBottom: spacing.md,
        fontFamily: fontFamilies.body,
    },
    previewNotice: {
        marginTop: spacing.md,
        padding: spacing.sm,
        borderRadius: radius.smPlus,
        backgroundColor: colors.surfaceInfo,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    previewNoteText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    previewErrorText: {
        color: colors.danger,
        fontWeight: '600',
    },
    previewList: {
        marginTop: spacing.mdPlus,
        gap: spacing.md,
    },
    previewTitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    previewCardWrap: {
        width: '100%',
    },
    previewFooter: {
        paddingTop: spacing.md,
    },
    previewDescription: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        lineHeight: 18,
        fontFamily: fontFamilies.body,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lgPlus,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.borderSubtle,
    },
    dividerText: {
        marginHorizontal: spacing.sm,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 1,
        fontFamily: fontFamilies.body,
    },
    field: {
        marginBottom: spacing.mdPlus,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.mdPlus,
    },
    fieldCol: {
        flex: 1,
    },
    imageUpload: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSubtle,
    },
    imagePreview: {
        width: '100%',
        height: 160,
    },
    imagePlaceholder: {
        width: '100%',
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlayMedium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageOverlayText: {
        color: colors.white,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    imageErrorText: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.danger,
        fontFamily: fontFamilies.body,
    },
    label: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: radius.smPlus,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceWhiteFrosted,
        fontFamily: fontFamilies.body,
    },
    textArea: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: radius.smPlus,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceWhiteFrosted,
        minHeight: 120,
        fontFamily: fontFamilies.body,
    },
    inputPressable: {
        justifyContent: 'center',
    },
    pickerCard: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.sm,
        marginBottom: spacing.mdPlus,
    },
    pickerDoneButton: {
        alignSelf: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xsPlus,
    },
    pickerDoneText: {
        color: colors.linkAccent,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    primaryButton: {
        marginTop: spacing.sm,
        backgroundColor: colors.brandPurple,
        borderRadius: radius.smPlus,
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    primaryButtonDisabled: {
        backgroundColor: colors.disabled,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});

export default SubmitEvent;
