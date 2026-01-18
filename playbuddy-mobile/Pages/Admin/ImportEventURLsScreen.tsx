import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import { useImportEventURLs } from '../../Common/db-axios/useEvents';
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

type ImportStatus = 'idle' | 'importing' | 'done' | 'error';
type AnyObj = Record<string, any>;

const isValidUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

const parseUrls = (input: string) => {
    const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const urls = lines.filter(isValidUrl);
    return {
        urls: Array.from(new Set(urls)),
        invalidCount: Math.max(0, lines.length - urls.length),
        totalCount: lines.length,
    };
};

type ImportRowStatus = 'Inserted' | 'Upserted' | 'Failed' | 'OK';

const getRowStatus = (row: AnyObj): ImportRowStatus => {
    const r: AnyObj = row || {};
    const statusStr = (r.status || r.result || '').toString().toLowerCase();
    const success = r.success;

    if (r.error || statusStr === 'error' || success === false) return 'Failed';

    if (r.created === true || statusStr === 'created' || r.inserted === true) return 'Inserted';
    if (r.updated === true || statusStr === 'updated' || r.upserted === true) return 'Upserted';

    return 'OK';
};

const extractEventSummary = (row: AnyObj) => {
    const ev = row?.event ?? row;
    const name = ev?.name ?? '(no name)';
    const organizer = ev?.organizer?.name ?? '(no organizer)';
    const startDate = ev?.start_date || ev?.start_time || ev?.end_time || null;
    const location = ev?.location || ev?.venue_name || ev?.venue || ev?.address || '';
    const status = getRowStatus(row);
    return { name, organizer, startDate, location, status };
};

const formatDate = (value?: string | null) => {
    if (!value) return 'Date TBD';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Date TBD';
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getStatusTone = (status: ImportRowStatus) => {
    if (status === 'Inserted') {
        return {
            background: 'rgba(52,199,89,0.15)',
            border: 'rgba(52,199,89,0.35)',
            text: colors.success,
        };
    }
    if (status === 'Upserted') {
        return {
            background: colors.accentBlueSoft,
            border: colors.accentBlueBorder,
            text: colors.accentBlue,
        };
    }
    if (status === 'Failed') {
        return {
            background: 'rgba(239,68,68,0.12)',
            border: 'rgba(239,68,68,0.35)',
            text: colors.danger,
        };
    }
    return {
        background: colors.surfaceSubtle,
        border: colors.borderSubtle,
        text: colors.textMuted,
    };
};

export const ImportEventURLsScreen = () => {
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const importEvents = useImportEventURLs();

    const [input, setInput] = useState('');
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [result, setResult] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { urls, invalidCount, totalCount } = useMemo(() => parseUrls(input), [input]);

    const eventsArray = useMemo(() => {
        if (Array.isArray(result)) return result;
        return (result?.events as AnyObj[]) ?? [];
    }, [result]);

    const counts = useMemo(() => {
        if (!eventsArray.length) return null;
        let inserted = 0;
        let upserted = 0;
        let failed = 0;
        let ok = 0;
        eventsArray.forEach((row) => {
            const rowStatus = getRowStatus(row);
            if (rowStatus === 'Inserted') inserted += 1;
            else if (rowStatus === 'Upserted') upserted += 1;
            else if (rowStatus === 'Failed') failed += 1;
            else ok += 1;
        });
        const derived = { inserted, upserted, failed, ok, total: eventsArray.length };
        if (!result?.counts) return derived;
        return {
            inserted: result.counts.inserted ?? derived.inserted,
            upserted: result.counts.upserted ?? derived.upserted,
            failed: result.counts.failed ?? derived.failed,
            ok: derived.ok,
            total: result.counts.total ?? derived.total,
        };
    }, [eventsArray, result]);

    const handleImport = async () => {
        if (!urls.length || status === 'importing') return;
        setStatus('importing');
        setResult(null);
        setErrorMessage(null);
        try {
            const response = await importEvents.mutateAsync({ urls, sync: true });
            setResult(response);
            setStatus('done');
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err?.message || 'Import failed.');
        }
    };

    const handleInputChange = (value: string) => {
        setInput(value);
        if (status !== 'idle') setStatus('idle');
        if (result) setResult(null);
        if (errorMessage) setErrorMessage(null);
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
                        Import tools are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                    <Ionicons name="link" size={22} color={colors.brandIndigo} />
                </View>
                <Text style={styles.heroTitle}>Import Event URLs</Text>
                <Text style={styles.heroSubtitle}>
                    Paste event links to pull new events into PlayBuddy.
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Event URLs</Text>
                <TextInput
                    value={input}
                    onChangeText={handleInputChange}
                    placeholder="Paste one URL per line"
                    placeholderTextColor={colors.textSubtle}
                    multiline
                    textAlignVertical="top"
                    style={styles.textInput}
                />
                <View style={styles.helperRow}>
                    <Text style={styles.helperText}>{urls.length} valid</Text>
                    <Text style={styles.helperText}>{invalidCount} invalid</Text>
                    <Text style={styles.helperText}>{totalCount} total</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        (!urls.length || status === 'importing') && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleImport}
                    disabled={!urls.length || status === 'importing'}
                >
                    <Text style={styles.primaryButtonText}>
                        {status === 'importing' ? 'Importing...' : 'Import URLs'}
                    </Text>
                </TouchableOpacity>

                {status === 'done' && (
                    <View style={styles.statusRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.statusSuccess}>Import complete</Text>
                    </View>
                )}
                {status === 'error' && (
                    <View style={styles.statusRow}>
                        <Ionicons name="alert-circle" size={16} color={colors.danger} />
                        <Text style={styles.statusError}>{errorMessage || 'Import failed'}</Text>
                    </View>
                )}
            </View>

            {(result?.requested != null || result?.scraped != null || counts) && (
                <View style={styles.statsGrid}>
                    {result?.requested != null && (
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Requested</Text>
                            <Text style={styles.statValue}>{result.requested}</Text>
                        </View>
                    )}
                    {result?.scraped != null && (
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Scraped</Text>
                            <Text style={styles.statValue}>{result.scraped}</Text>
                        </View>
                    )}
                    {counts && (
                        <>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Inserted</Text>
                                <Text style={styles.statValue}>{counts.inserted}</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Upserted</Text>
                                <Text style={styles.statValue}>{counts.upserted}</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Failed</Text>
                                <Text style={styles.statValue}>{counts.failed}</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Returned</Text>
                                <Text style={styles.statValue}>{counts.total}</Text>
                            </View>
                        </>
                    )}
                </View>
            )}

            {result && (
                <View style={styles.card}>
                    <View style={styles.resultsHeader}>
                        <Text style={styles.resultsTitle}>Imported events</Text>
                        <Text style={styles.resultsCount}>{eventsArray.length} events</Text>
                    </View>

                    {eventsArray.length === 0 ? (
                        <Text style={styles.emptyText}>No events returned.</Text>
                    ) : (
                        eventsArray.map((row, index) => {
                            const { name, organizer, startDate, location, status: rowStatus } = extractEventSummary(row);
                            const tone = getStatusTone(rowStatus);
                            return (
                                <View
                                    key={`${name}-${index}`}
                                    style={[styles.resultRow, index === eventsArray.length - 1 && styles.lastRow]}
                                >
                                    <View style={styles.resultBody}>
                                        <Text style={styles.resultTitle} numberOfLines={1}>
                                            {name}
                                        </Text>
                                        <Text style={styles.resultMeta} numberOfLines={1}>
                                            {organizer}
                                        </Text>
                                        <Text style={styles.resultMeta} numberOfLines={1}>
                                            {formatDate(startDate)}{location ? ` - ${location}` : ''}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusPill, { backgroundColor: tone.background, borderColor: tone.border }]}>
                                        <Text style={[styles.statusPillText, { color: tone.text }]}>{rowStatus}</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            )}
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
        backgroundColor: colors.surfaceLavenderLight,
        borderRadius: radius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        marginBottom: spacing.lgPlus,
        ...shadows.card,
    },
    heroIcon: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceWhiteStrong,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    heroTitle: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.brandDeep,
        fontFamily: fontFamilies.display,
    },
    heroSubtitle: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        marginTop: spacing.xs,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.lg,
        marginBottom: spacing.lgPlus,
        ...shadows.card,
    },
    label: {
        fontSize: fontSizes.sm,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    textInput: {
        minHeight: 140,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radius.sm,
        padding: spacing.md,
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceSubtle,
    },
    helperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    helperText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    primaryButton: {
        marginTop: spacing.mdPlus,
        paddingVertical: spacing.smPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.accentPurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.base,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    statusSuccess: {
        marginLeft: spacing.xs,
        color: colors.success,
        fontFamily: fontFamilies.body,
    },
    statusError: {
        marginLeft: spacing.xs,
        color: colors.danger,
        fontFamily: fontFamilies.body,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lgPlus,
    },
    statCard: {
        minWidth: '46%',
        flexGrow: 1,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.mdPlus,
        ...shadows.card,
    },
    statLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    statValue: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.display,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    resultsTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    resultsCount: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    emptyText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    resultBody: {
        flex: 1,
        marginRight: spacing.sm,
    },
    resultTitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    resultMeta: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    statusPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
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
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
});

export default ImportEventURLsScreen;
