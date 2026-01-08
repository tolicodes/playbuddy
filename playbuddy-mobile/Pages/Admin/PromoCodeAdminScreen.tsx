import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SectionList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { useFetchOrganizers } from '../../Common/db-axios/useOrganizers';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import {
    useAddPromoCodeToEvent,
    useCreatePromoCode,
    useDeletePromoCodeFromEvent,
    useFetchPromoCodes,
} from '../../Common/db-axios/usePromoCodes';
import type { Event, Organizer, PromoCode } from '../../Common/types/commonTypes';
import type { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { useGroupedEvents } from '../Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from '../Calendar/ListView/EventListItem';
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

type DiscountType = 'percent' | 'fixed';
type PromoScope = 'event' | 'organizer';

const formatDiscountLabel = (promoCode: PromoCode) => {
    if (promoCode.discount_type === 'percent') {
        return `${promoCode.discount}% off`;
    }
    return `$${promoCode.discount} off`;
};

const OptionPill = ({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.optionPill, active && styles.optionPillActive]}
        onPress={onPress}
    >
        <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export const PromoCodeAdminScreen = () => {
    const navigation = useNavigation<NavStack>();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { data: organizers = [], isLoading: loadingOrganizers, error: organizerError } = useFetchOrganizers({ includeHidden: true });
    const { data: events = [], isLoading: loadingEvents, error: eventsError } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
        includeApprovalPending: true,
    });
    const { data: promoCodes = [], isLoading: loadingPromoCodes, error: promoError } = useFetchPromoCodes();

    const createPromo = useCreatePromoCode();
    const addPromoToEvent = useAddPromoCodeToEvent();
    const deletePromoFromEvent = useDeletePromoCodeFromEvent();

    const [search, setSearch] = useState('');
    const [selectedOrganizerId, setSelectedOrganizerId] = useState<number | null>(null);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [discountInput, setDiscountInput] = useState('');
    const [discountType, setDiscountType] = useState<DiscountType>('percent');
    const [scope, setScope] = useState<PromoScope>('event');
    const [selectedPromoCodeId, setSelectedPromoCodeId] = useState<string | null>(null);
    const [processingEventId, setProcessingEventId] = useState<number | null>(null);

    const selectedOrganizer = useMemo(
        () => organizers.find((org) => org.id === selectedOrganizerId) || null,
        [organizers, selectedOrganizerId]
    );

    const filteredOrganizers = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const list = organizers.filter((org) => (org.name || '').toLowerCase().includes(needle));
        if (!needle) {
            return list.slice(0, 8);
        }
        return list.slice(0, 12);
    }, [organizers, search]);

    const organizerPromoCodes = useMemo(() => {
        if (!selectedOrganizerId) return [];
        return promoCodes
            .filter((code) => code.organizer_id === selectedOrganizerId)
            .sort((a, b) => (a.promo_code || '').localeCompare(b.promo_code || ''));
    }, [promoCodes, selectedOrganizerId]);

    const selectedPromoCode = useMemo(
        () => organizerPromoCodes.find((code) => code.id === selectedPromoCodeId) || null,
        [organizerPromoCodes, selectedPromoCodeId]
    );

    const organizerEvents = useMemo(() => {
        if (!selectedOrganizerId) return [] as Event[];
        return events
            .filter((event) => event.organizer?.id === selectedOrganizerId)
            .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    }, [events, selectedOrganizerId]);

    const { sections } = useGroupedEvents(organizerEvents as EventWithMetadata[]);

    useEffect(() => {
        if (!selectedOrganizerId) {
            setSelectedPromoCodeId(null);
            return;
        }
        if (selectedPromoCodeId && organizerPromoCodes.some((code) => code.id === selectedPromoCodeId)) {
            return;
        }
        setSelectedPromoCodeId(organizerPromoCodes[0]?.id ?? null);
    }, [organizerPromoCodes, selectedOrganizerId, selectedPromoCodeId]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (selectedOrganizer && value.trim() !== selectedOrganizer.name) {
            setSelectedOrganizerId(null);
        }
    };

    const handleSelectOrganizer = (organizer: Organizer) => {
        setSelectedOrganizerId(organizer.id);
        setSearch(organizer.name || '');
    };

    const handleClearOrganizer = () => {
        setSelectedOrganizerId(null);
        setSearch('');
        setSelectedPromoCodeId(null);
    };

    const handleCreatePromoCode = async () => {
        if (!selectedOrganizerId) return;
        const promoCode = promoCodeInput.trim();
        const discountValue = parseFloat(discountInput);
        if (!promoCode) {
            Alert.alert('Missing code', 'Enter a promo code.');
            return;
        }
        if (!Number.isFinite(discountValue)) {
            Alert.alert('Invalid discount', 'Enter a valid discount amount.');
            return;
        }
        if (discountValue < 0) {
            Alert.alert('Invalid discount', 'Discount must be zero or more.');
            return;
        }
        try {
            const response = await createPromo.mutateAsync({
                organizer_id: selectedOrganizerId,
                promo_code: promoCode,
                discount: discountValue,
                discount_type: discountType,
                scope,
            });
            const created = Array.isArray(response) ? response[0] : response;
            if (created?.id) {
                setSelectedPromoCodeId(created.id);
            }
            setPromoCodeInput('');
            setDiscountInput('');
            setDiscountType('percent');
            setScope('event');
        } catch {
            Alert.alert('Save failed', 'Unable to create promo code.');
        }
    };

    const handleAttachPromo = async (event: Event) => {
        if (!selectedPromoCodeId) {
            Alert.alert('Select a code', 'Choose a promo code to attach.');
            return;
        }
        setProcessingEventId(event.id);
        try {
            await addPromoToEvent.mutateAsync({ promoCodeId: selectedPromoCodeId, eventId: `${event.id}` });
        } catch {
            Alert.alert('Attach failed', 'Unable to attach promo code.');
        } finally {
            setProcessingEventId(null);
        }
    };

    const handleDetachPromo = async (event: Event, promoCodeId: string) => {
        setProcessingEventId(event.id);
        try {
            await deletePromoFromEvent.mutateAsync({ promoCodeId, eventId: `${event.id}` });
        } catch {
            Alert.alert('Remove failed', 'Unable to remove promo code.');
        } finally {
            setProcessingEventId(null);
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
                        Promo code tools are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    if (loadingOrganizers || loadingEvents || loadingPromoCodes) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.linkBlue} />
                <Text style={styles.loadingText}>Loading promo code manager...</Text>
            </View>
        );
    }

    if (organizerError || eventsError || promoError) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load promo code data.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                    const attachedPromo = item.promo_codes?.[0];
                    const isProcessing = processingEventId === item.id && (addPromoToEvent.isPending || deletePromoFromEvent.isPending);

                    const adminFooter = (
                        <View style={styles.adminActions}>
                            {attachedPromo ? (
                                <>
                                    <View style={[styles.codePill, styles.codePillAttached]}>
                                        <Ionicons name="ticket-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.codePillText}>{attachedPromo.promo_code}</Text>
                                        <Text style={styles.codePillMeta}>{formatDiscountLabel(attachedPromo)}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.actionPill, styles.actionPillDanger]}
                                        onPress={() => handleDetachPromo(item, attachedPromo.id)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={colors.danger} />
                                        ) : (
                                            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                                        )}
                                        <Text style={[styles.actionText, styles.actionTextDanger]}>Remove</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={[styles.codePill, !selectedPromoCode && styles.codePillMuted]}>
                                        <Ionicons name="ticket-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.codePillText}>
                                            {selectedPromoCode ? selectedPromoCode.promo_code : 'Select a promo code'}
                                        </Text>
                                        {selectedPromoCode && (
                                            <Text style={styles.codePillMeta}>{formatDiscountLabel(selectedPromoCode)}</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionPill,
                                            !selectedPromoCode && styles.actionPillDisabled,
                                        ]}
                                        onPress={() => handleAttachPromo(item)}
                                        disabled={!selectedPromoCode || isProcessing}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={colors.brandIndigo} />
                                        ) : (
                                            <Ionicons name="add-circle-outline" size={16} color={colors.brandIndigo} />
                                        )}
                                        <Text style={styles.actionText}>Attach</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    );

                    return (
                        <EventListItem
                            item={item as EventWithMetadata}
                            attendees={[]}
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
                }}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeaderOuterWrapper}>
                        <View style={styles.sectionHeaderPill}>
                            <Text style={styles.sectionHeaderText}>{section.title}</Text>
                        </View>
                    </View>
                )}
                stickySectionHeadersEnabled
                style={styles.sectionList}
                contentContainerStyle={styles.sectionListContent}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <View style={styles.heroCard}>
                            <View style={styles.heroIcon}>
                                <FAIcon name="ticket-alt" size={18} color={colors.brandIndigo} />
                            </View>
                            <Text style={styles.heroTitle}>Promo Code Manager</Text>
                            <Text style={styles.heroSubtitle}>
                                Create promo codes and attach them to organizer events.
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.label}>Organizer</Text>
                            <View style={styles.searchRow}>
                                <Ionicons name="search" size={16} color={colors.textSubtle} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search organizers"
                                    placeholderTextColor={colors.textSubtle}
                                    value={search}
                                    onChangeText={handleSearchChange}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                />
                                {selectedOrganizerId && (
                                    <TouchableOpacity onPress={handleClearOrganizer}>
                                        <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {!selectedOrganizerId && filteredOrganizers.length > 0 && (
                                <View style={styles.dropdown}>
                                    {filteredOrganizers.map((org) => (
                                        <TouchableOpacity
                                            key={org.id}
                                            style={styles.dropdownRow}
                                            onPress={() => handleSelectOrganizer(org)}
                                        >
                                            <Text style={styles.dropdownText}>{org.name}</Text>
                                            {org.hidden && (
                                                <View style={styles.hiddenBadge}>
                                                    <Text style={styles.hiddenBadgeText}>Hidden</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {selectedOrganizer && (
                                <View style={styles.selectedRow}>
                                    <View style={styles.selectedInfo}>
                                        <Text style={styles.selectedTitle}>{selectedOrganizer.name}</Text>
                                        <Text style={styles.selectedMeta}>
                                            {organizerEvents.length} events | {organizerPromoCodes.length} codes
                                        </Text>
                                    </View>
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>Selected</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {selectedOrganizer && (
                            <>
                                <View style={styles.card}>
                                    <Text style={styles.label}>Create promo code</Text>
                                    <TextInput
                                        value={promoCodeInput}
                                        onChangeText={setPromoCodeInput}
                                        placeholder="Promo code"
                                        placeholderTextColor={colors.textSubtle}
                                        autoCapitalize="characters"
                                        style={styles.textInput}
                                    />
                                    <TextInput
                                        value={discountInput}
                                        onChangeText={setDiscountInput}
                                        placeholder="Discount (e.g., 10 or 10.00)"
                                        placeholderTextColor={colors.textSubtle}
                                        keyboardType="decimal-pad"
                                        style={styles.textInput}
                                    />

                                    <View style={styles.optionRow}>
                                        <Text style={styles.optionLabel}>Discount Type</Text>
                                        <View style={styles.optionPills}>
                                            <OptionPill
                                                label="Percent"
                                                active={discountType === 'percent'}
                                                onPress={() => setDiscountType('percent')}
                                            />
                                            <OptionPill
                                                label="Fixed"
                                                active={discountType === 'fixed'}
                                                onPress={() => setDiscountType('fixed')}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.optionRow}>
                                        <Text style={styles.optionLabel}>Scope</Text>
                                        <View style={styles.optionPills}>
                                            <OptionPill
                                                label="Event"
                                                active={scope === 'event'}
                                                onPress={() => setScope('event')}
                                            />
                                            <OptionPill
                                                label="Organizer"
                                                active={scope === 'organizer'}
                                                onPress={() => setScope('organizer')}
                                            />
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.primaryButton,
                                            createPromo.isPending && styles.primaryButtonDisabled,
                                        ]}
                                        onPress={handleCreatePromoCode}
                                        disabled={createPromo.isPending}
                                    >
                                        {createPromo.isPending ? (
                                            <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>Create promo code</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.card}>
                                    <Text style={styles.label}>Organizer promo codes</Text>
                                    {organizerPromoCodes.length === 0 ? (
                                        <Text style={styles.emptyText}>No promo codes yet.</Text>
                                    ) : (
                                        <View style={styles.codeGrid}>
                                            {organizerPromoCodes.map((code) => {
                                                const isSelected = selectedPromoCodeId === code.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={code.id}
                                                        style={[styles.codeTile, isSelected && styles.codeTileActive]}
                                                        onPress={() => setSelectedPromoCodeId(code.id)}
                                                    >
                                                        <Text style={[styles.codeTileTitle, isSelected && styles.codeTileTitleActive]}>
                                                            {code.promo_code}
                                                        </Text>
                                                        <Text style={[styles.codeTileMeta, isSelected && styles.codeTileMetaActive]}>
                                                            {formatDiscountLabel(code)}
                                                        </Text>
                                                        <Text style={[styles.codeTileScope, isSelected && styles.codeTileScopeActive]}>
                                                            {code.scope === 'organizer' ? 'Organizer' : 'Event'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>
                            {selectedOrganizerId ? 'No events found for this organizer.' : 'Select an organizer to view events.'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    sectionList: {
        flex: 1,
    },
    sectionListContent: {
        paddingBottom: spacing.xxxl,
    },
    listHeader: {
        padding: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.lg,
    },
    heroCard: {
        borderRadius: radius.xl,
        padding: spacing.xl,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    heroIcon: {
        width: 34,
        height: 34,
        borderRadius: radius.smPlus,
        backgroundColor: colors.surfaceGoldWarm,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    heroTitle: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    heroSubtitle: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        marginTop: spacing.xs,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        maxWidth: 300,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.lg,
        ...shadows.card,
    },
    label: {
        fontSize: fontSizes.sm,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        marginBottom: spacing.sm,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceSubtle,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    dropdown: {
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: radius.md,
        overflow: 'hidden',
    },
    dropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: colors.surfaceWhiteOpaque,
    },
    dropdownText: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    hiddenBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceRose,
    },
    hiddenBadgeText: {
        fontSize: fontSizes.xs,
        color: colors.danger,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    selectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
    },
    selectedInfo: {
        flex: 1,
    },
    selectedTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    selectedMeta: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    selectedBadge: {
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    selectedBadgeText: {
        fontSize: fontSizes.xs,
        color: colors.brandIndigo,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.sm,
        backgroundColor: colors.surfaceSubtle,
    },
    optionRow: {
        marginTop: spacing.sm,
    },
    optionLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '500',
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xs,
    },
    optionPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    optionPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceSubtle,
    },
    optionPillActive: {
        backgroundColor: colors.tintViolet,
        borderColor: colors.borderLavenderAlt,
    },
    optionText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    optionTextActive: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    primaryButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.md,
        paddingVertical: spacing.smPlus,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        fontSize: fontSizes.base,
        color: colors.white,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    codeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    codeTile: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: radius.md,
        padding: spacing.smPlus,
        minWidth: 120,
        backgroundColor: colors.surfaceSubtle,
    },
    codeTileActive: {
        borderColor: colors.brandIndigo,
        backgroundColor: colors.surfaceLavenderLight,
    },
    codeTileTitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    codeTileTitleActive: {
        color: colors.brandIndigo,
    },
    codeTileMeta: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    codeTileMetaActive: {
        color: colors.brandIndigo,
    },
    codeTileScope: {
        fontSize: fontSizes.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.textSubtle,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    codeTileScopeActive: {
        color: colors.brandIndigo,
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
        marginHorizontal: spacing.lg,
    },
    sectionHeaderPill: {
        width: '100%',
        backgroundColor: colors.surfaceWhiteFrosted,
        paddingHorizontal: spacing.lg,
        height: 34,
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
        flexWrap: 'wrap',
        gap: spacing.sm,
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
    },
    actionPillDisabled: {
        opacity: 0.6,
    },
    actionPillDanger: {
        borderColor: colors.borderRose,
        backgroundColor: colors.surfaceRoseSoft,
    },
    actionText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    actionTextDanger: {
        color: colors.danger,
        fontWeight: '600',
    },
    codePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        backgroundColor: colors.surfaceLavenderLight,
    },
    codePillAttached: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderMutedAlt,
    },
    codePillMuted: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderSubtle,
    },
    codePillText: {
        fontSize: fontSizes.sm,
        color: colors.textPrimary,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    codePillMeta: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    emptyState: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceMuted,
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    errorText: {
        fontSize: fontSizes.base,
        color: colors.danger,
        padding: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    lockedCard: {
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    lockedIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    lockedTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    lockedText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
    },
});

export default PromoCodeAdminScreen;
