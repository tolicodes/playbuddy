import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Polyline } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {
    useFetchAnalyticsIndex,
    type AnalyticsChartDefinition,
} from '../../Common/db-axios/useAnalyticsIndex';
import { useFetchAnalyticsChart } from '../../Common/db-axios/useAnalyticsChart';
import {
    getUserEventCategory,
    getUserEventDisplayName,
} from '../../Common/analytics/userEventCatalog';
import type { BranchStatsMeta, BranchStatsRow } from '../../Common/db-axios/useBranchStats';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../config';
import {
    colors,
    eventListThemes,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

const logoMark = require('../../assets/logo-transparent.png');

type RangePreset = 'month' | 'quarter' | 'year' | 'all';

type RangeConfig = {
    preset: RangePreset;
    startDate: string;
    endDate: string;
    label: string;
};

type UsersOverTimeRow = {
    date: string;
    newUsers: number;
    totalUsers: number;
};

type WeeklyActiveRow = {
    weekStart: string;
    activeUsers: number;
};

type UniqueDeviceRow = {
    date: string;
    withUser: number;
    withoutUser: number;
};

type UserActionsRow = {
    authUserId: string | null;
    name: string | null;
    actions: number;
};

type UserTicketClicksRow = {
    authUserId: string | null;
    name: string | null;
    ticketClicks: number;
};

type AuthMethodRow = {
    id: string;
    label: string;
    total: number;
    uniqueUsers: number;
};

type UserProfileRow = {
    authUserId: string;
    name: string | null;
    createdAt: string | null;
    totalEvents: number;
    uniqueEvents: number;
    lastEventAt: string | null;
};

type EventClicksRow = {
    eventId: number;
    eventName: string | null;
    organizerId: number | null;
    organizerName: string | null;
    totalClicks: number;
    uniqueUsers: number;
};

type TicketClicksRow = {
    eventId: number;
    eventName: string | null;
    organizerId: number | null;
    organizerName: string | null;
    ticketClicks: number;
    uniqueUsers: number;
};

type OrganizerClicksRow = {
    organizerId: number | null;
    organizerName: string | null;
    totalClicks: number;
    uniqueUsers: number;
};

type OrganizerTicketClicksRow = {
    organizerId: number | null;
    organizerName: string | null;
    ticketClicks: number;
    uniqueUsers: number;
};

type DeepLinkRow = {
    id: string;
    slug: string | null;
    campaign: string | null;
    channel: string | null;
    organizerName: string | null;
    detectedUsers: number;
    attributedUsers: number;
    eventClickUsers: number;
    ticketClickUserEvents: number;
};

type TopUserEventRow = {
    eventName: string;
    total: number;
    uniqueUsers: number;
};

type ModalClickSummaryRow = {
    modalId: string;
    modalLabel: string;
    primaryUsers: number;
    skipUsers: number;
};

type FeatureUsageCategoryRow = {
    category: string;
    total: number;
    uniqueUsers: number;
};

type FeatureUsagePayload = {
    categories: FeatureUsageCategoryRow[];
};

type BranchStatsPayload = {
    meta: BranchStatsMeta;
    rows: BranchStatsRow[];
};

type OnboardingSankeyNode = {
    id: string;
    label: string;
    stage: number;
    value: number;
};

type OnboardingSankeyLink = {
    source: string;
    target: string;
    value: number;
};

type OnboardingSankeyPayload = {
    nodes: OnboardingSankeyNode[];
    links: OnboardingSankeyLink[];
};

type ListRow = {
    label: string;
    value: string;
    subtitle?: string;
};

const PRESET_OPTIONS: Array<{ value: RangePreset; label: string }> = [
    { value: 'month', label: '30d' },
    { value: 'quarter', label: '90d' },
    { value: 'year', label: '1y' },
    { value: 'all', label: 'All' },
];

const CHART_LIMITS: Record<string, number> = {
    most_active_users: 8,
    users_most_ticket_clicks: 8,
    user_profiles: 8,
    top_user_events: 8,
    top_events_clicks: 8,
    event_clicks_per_organizer: 8,
    ticket_clicks_per_event: 8,
    ticket_clicks_per_organizer: 8,
};

const formatNumber = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return Number(value).toLocaleString();
};

const formatDuration = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '-';
    const totalSeconds = Math.max(0, Number(seconds));
    const totalHours = totalSeconds / 3600;
    if (totalHours < 24) {
        return `${totalHours.toFixed(1)}h`;
    }
    const totalDays = totalHours / 24;
    return `${totalDays.toFixed(1)}d`;
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const buildRangeFromPreset = (preset: RangePreset): RangeConfig => {
    const end = new Date();
    const endDate = formatDateInput(end);
    if (preset === 'all') {
        return { preset, startDate: '2000-01-01', endDate, label: 'All time' };
    }
    const start = new Date(end);
    if (preset === 'year') start.setUTCDate(start.getUTCDate() - 365);
    if (preset === 'quarter') start.setUTCDate(start.getUTCDate() - 90);
    if (preset === 'month') start.setUTCDate(start.getUTCDate() - 30);
    return {
        preset,
        startDate: formatDateInput(start),
        endDate,
        label: `${formatDateInput(start)} to ${endDate}`,
    };
};

const MiniLineChart = ({
    points,
    color,
}: {
    points: number[];
    color: string;
}) => {
    if (points.length < 2) {
        return <Text style={styles.chartEmptyText}>Not enough data for a trend.</Text>;
    }
    const width = 240;
    const height = 60;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pointsString = points
        .map((value, index) => {
            const x = (index / (points.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            return `${x},${y}`;
        })
        .join(' ');
    return (
        <View style={styles.miniChart}>
            <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
                <Polyline
                    points={pointsString}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
};

const MiniBarChart = ({
    points,
    color,
}: {
    points: number[];
    color: string;
}) => {
    if (!points.length) {
        return <Text style={styles.chartEmptyText}>No bar data yet.</Text>;
    }
    const max = Math.max(...points, 1);
    return (
        <View style={styles.barChart}>
            {points.map((value, index) => {
                const height = Math.max(4, (value / max) * 56);
                return (
                    <View
                        key={`bar-${index}`}
                        style={[styles.barItem, { height, backgroundColor: color }]}
                    />
                );
            })}
        </View>
    );
};

const renderListRows = (rows: ListRow[], emptyLabel = 'No data.') => {
    if (!rows.length) {
        return <Text style={styles.chartEmptyText}>{emptyLabel}</Text>;
    }
    return (
        <View style={styles.list}>
            {rows.map((row, index) => (
                <View
                    key={`${row.label}-${index}`}
                    style={[styles.listRow, index === rows.length - 1 && styles.listRowLast]}
                >
                    <View style={styles.listRowBody}>
                        <Text style={styles.listRowLabel} numberOfLines={1}>
                            {row.label}
                        </Text>
                        {row.subtitle ? (
                            <Text style={styles.listRowSubtitle} numberOfLines={1}>
                                {row.subtitle}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={styles.listRowValue}>{row.value}</Text>
                </View>
            ))}
        </View>
    );
};

const renderBarRows = (
    rows: Array<{ label: string; value: number; meta?: string }>,
    color: string,
    emptyLabel = 'No data.'
) => {
    if (!rows.length) {
        return <Text style={styles.chartEmptyText}>{emptyLabel}</Text>;
    }
    const max = Math.max(...rows.map((row) => row.value), 1);
    return (
        <View style={styles.barList}>
            {rows.map((row, index) => {
                const width = Math.round((row.value / max) * 100);
                return (
                    <View key={`${row.label}-${index}`} style={styles.barRow}>
                        <View style={styles.barRowHeader}>
                            <Text style={styles.barRowLabel} numberOfLines={1}>
                                {row.label}
                            </Text>
                            <Text style={styles.barRowValue}>{formatNumber(row.value)}</Text>
                        </View>
                        <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color }]} />
                        </View>
                        {row.meta ? (
                            <Text style={styles.barMeta} numberOfLines={1}>
                                {row.meta}
                            </Text>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
};

const buildTopSankeyRows = (payload: OnboardingSankeyPayload, limit: number) => {
    const nodesById = new Map((payload.nodes || []).map((node) => [node.id, node.label]));
    return (payload.links || [])
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((link) => ({
            label: `${nodesById.get(link.source) ?? link.source} -> ${nodesById.get(link.target) ?? link.target}`,
            value: `${formatNumber(link.value)} users`,
        }));
};

const ChartCard = ({
    chart,
    range,
}: {
    chart: AnalyticsChartDefinition;
    range: RangeConfig;
}) => {
    const limit = CHART_LIMITS[chart.id];
    const { data, isLoading, error } = useFetchAnalyticsChart<any>({
        chartId: chart.id,
        startDate: range.startDate,
        endDate: range.endDate,
        preset: range.preset,
        limit,
    });

    const chartData = data?.data;

    const content = () => {
        if (!chartData) {
            return <Text style={styles.chartEmptyText}>No data.</Text>;
        }

        if (chart.id === 'users_over_time') {
            const rows = chartData as UsersOverTimeRow[];
            const latest = rows[rows.length - 1];
            const points = rows.map((row) => row.totalUsers);
            return (
                <View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricValue}>{formatNumber(latest?.totalUsers)}</Text>
                        <Text style={styles.metricLabel}>Total users</Text>
                    </View>
                    <MiniLineChart points={points} color={colors.accentBlue} />
                </View>
            );
        }

        if (chart.id === 'new_users_per_day') {
            const rows = chartData as UsersOverTimeRow[];
            const total = rows.reduce((sum, row) => sum + (row.newUsers ?? 0), 0);
            const recent = rows.slice(-14);
            const points = recent.map((row) => row.newUsers);
            return (
                <View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricValue}>{formatNumber(total)}</Text>
                        <Text style={styles.metricLabel}>New users in range</Text>
                    </View>
                    <MiniBarChart points={points} color={colors.accentPurple} />
                </View>
            );
        }

        if (chart.id === 'weekly_active_users') {
            const rows = chartData as WeeklyActiveRow[];
            const latest = rows[rows.length - 1];
            const points = rows.map((row) => row.activeUsers);
            return (
                <View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricValue}>{formatNumber(latest?.activeUsers)}</Text>
                        <Text style={styles.metricLabel}>Weekly active users</Text>
                    </View>
                    <MiniLineChart points={points} color={colors.accentGreen} />
                </View>
            );
        }

        if (chart.id === 'unique_devices_over_time') {
            const rows = chartData as UniqueDeviceRow[];
            const latest = rows[rows.length - 1];
            const totalDevices = (latest?.withUser ?? 0) + (latest?.withoutUser ?? 0);
            const points = rows.map((row) => (row.withUser ?? 0) + (row.withoutUser ?? 0));
            return (
                <View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricValue}>{formatNumber(totalDevices)}</Text>
                        <Text style={styles.metricLabel}>Current unique devices</Text>
                    </View>
                    <View style={styles.metricSubRow}>
                        <Text style={styles.metricSubLabel}>
                            With user {formatNumber(latest?.withUser)}
                        </Text>
                        <Text style={styles.metricSubLabel}>
                            Device only {formatNumber(latest?.withoutUser)}
                        </Text>
                    </View>
                    <MiniLineChart points={points} color={colors.accentSkyDeep} />
                </View>
            );
        }

        if (chart.id === 'anonymous_devices_summary') {
            const summary = chartData as {
                deviceCount: number;
                avgSeconds: number;
                medianSeconds: number;
                maxSeconds: number;
            };
            return (
                <View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricValue}>{formatNumber(summary.deviceCount)}</Text>
                        <Text style={styles.metricLabel}>Devices without users in range</Text>
                    </View>
                    <View style={styles.statRow}>
                        <View style={styles.statChip}>
                            <Text style={styles.statLabel}>Avg</Text>
                            <Text style={styles.statValue}>{formatDuration(summary.avgSeconds)}</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Text style={styles.statLabel}>Median</Text>
                            <Text style={styles.statValue}>{formatDuration(summary.medianSeconds)}</Text>
                        </View>
                        <View style={[styles.statChip, styles.statChipLast]}>
                            <Text style={styles.statLabel}>Max</Text>
                            <Text style={styles.statValue}>{formatDuration(summary.maxSeconds)}</Text>
                        </View>
                    </View>
                </View>
            );
        }

        if (chart.id === 'most_active_users') {
            const rows = (chartData as UserActionsRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.name || row.authUserId || 'Unknown user',
                value: formatNumber(row.actions),
            }));
            return renderListRows(listRows, 'No users yet.');
        }

        if (chart.id === 'users_most_ticket_clicks') {
            const rows = (chartData as UserTicketClicksRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.name || row.authUserId || 'Unknown user',
                value: formatNumber(row.ticketClicks),
            }));
            return renderListRows(listRows, 'No ticket click data.');
        }

        if (chart.id === 'auth_method_breakdown') {
            const rows = chartData as AuthMethodRow[];
            const barRows = rows.map((row) => ({
                label: row.label,
                value: row.uniqueUsers,
                meta: `Total ${formatNumber(row.total)}`,
            }));
            return renderBarRows(barRows, colors.brandIndigo, 'No auth data.');
        }

        if (chart.id === 'user_profiles') {
            const rows = (chartData as UserProfileRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.name || row.authUserId || 'Unknown user',
                value: `${formatNumber(row.uniqueEvents)} unique`,
                subtitle: `Total ${formatNumber(row.totalEvents)}`,
            }));
            return renderListRows(listRows, 'No profiles yet.');
        }

        if (chart.id === 'top_events_clicks') {
            const rows = (chartData as EventClicksRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.eventName || 'Unknown event',
                value: formatNumber(row.totalClicks),
                subtitle: `Unique ${formatNumber(row.uniqueUsers)}`,
            }));
            return renderListRows(listRows, 'No clicks yet.');
        }

        if (chart.id === 'event_clicks_per_organizer') {
            const rows = (chartData as OrganizerClicksRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.organizerName || 'Unknown organizer',
                value: formatNumber(row.totalClicks),
                subtitle: `Unique ${formatNumber(row.uniqueUsers)}`,
            }));
            return renderListRows(listRows, 'No organizer clicks yet.');
        }

        if (chart.id === 'ticket_clicks_per_event') {
            const rows = (chartData as TicketClicksRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.eventName || 'Unknown event',
                value: formatNumber(row.ticketClicks),
                subtitle: `Unique ${formatNumber(row.uniqueUsers)}`,
            }));
            return renderListRows(listRows, 'No ticket clicks yet.');
        }

        if (chart.id === 'ticket_clicks_per_organizer') {
            const rows = (chartData as OrganizerTicketClicksRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.organizerName || 'Unknown organizer',
                value: formatNumber(row.ticketClicks),
                subtitle: `Unique ${formatNumber(row.uniqueUsers)}`,
            }));
            return renderListRows(listRows, 'No ticket clicks yet.');
        }

        if (chart.id === 'deep_link_sankey') {
            const payload = chartData as OnboardingSankeyPayload;
            const listRows = buildTopSankeyRows(payload, 5);
            return renderListRows(listRows, 'No deep link flow data.');
        }

        if (chart.id === 'deep_link_performance') {
            const rows = (chartData as DeepLinkRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.slug || row.campaign || row.channel || row.id,
                value: formatNumber(row.eventClickUsers),
                subtitle: `Ticket clicked (unique) ${formatNumber(row.ticketClickUserEvents)}`,
            }));
            return renderListRows(listRows, 'No deep links yet.');
        }

        if (chart.id === 'branch_stats') {
            const payload = chartData as BranchStatsPayload;
            const rows = (payload?.rows ?? []).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.name || row.url || 'Branch link',
                value: formatNumber(row.stats?.overallClicks ?? 0),
                subtitle: row.url || 'Link stats',
            }));
            return renderListRows(listRows, 'No Branch stats yet.');
        }

        if (chart.id === 'top_user_events') {
            const rows = (chartData as TopUserEventRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: getUserEventDisplayName(row.eventName),
                value: formatNumber(row.uniqueUsers),
                subtitle: getUserEventCategory(row.eventName),
            }));
            return renderListRows(listRows, 'No events yet.');
        }

        if (chart.id === 'feature_usage_table') {
            const payload = chartData as FeatureUsagePayload;
            const rows = (payload.categories || []).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.category,
                value: formatNumber(row.uniqueUsers),
                subtitle: `Total ${formatNumber(row.total)}`,
            }));
            return renderListRows(listRows, 'No feature usage yet.');
        }

        if (chart.id === 'modal_sankey') {
            const payload = chartData as OnboardingSankeyPayload;
            const listRows = buildTopSankeyRows(payload, 5);
            return renderListRows(listRows, 'No modal flow data.');
        }

        if (chart.id === 'modal_click_summary') {
            const rows = (chartData as ModalClickSummaryRow[]).slice(0, 5);
            const listRows = rows.map((row) => ({
                label: row.modalLabel,
                value: formatNumber(row.primaryUsers),
                subtitle: `Skip ${formatNumber(row.skipUsers)}`,
            }));
            return renderListRows(listRows, 'No modal clicks yet.');
        }

        if (chart.id === 'onboarding_sankey') {
            const payload = chartData as OnboardingSankeyPayload;
            const listRows = buildTopSankeyRows(payload, 5);
            return renderListRows(listRows, 'No onboarding flow data.');
        }

        if (chart.id === 'skip_to_signup') {
            const summary = chartData as {
                userCount: number;
                avgSeconds: number;
                medianSeconds: number;
                neverSignedUp: number;
            };
            return (
                <View>
                    <View style={styles.metricRow}>
                        <Text style={styles.metricValue}>{formatNumber(summary.userCount)}</Text>
                        <Text style={styles.metricLabel}>Users who skipped and signed up</Text>
                    </View>
                    <View style={styles.metricSubRow}>
                        <Text style={styles.metricSubLabel}>
                            Never signed up {formatNumber(summary.neverSignedUp)}
                        </Text>
                    </View>
                    <View style={styles.statRow}>
                        <View style={styles.statChip}>
                            <Text style={styles.statLabel}>Avg</Text>
                            <Text style={styles.statValue}>{formatDuration(summary.avgSeconds)}</Text>
                        </View>
                        <View style={[styles.statChip, styles.statChipLast]}>
                            <Text style={styles.statLabel}>Median</Text>
                            <Text style={styles.statValue}>{formatDuration(summary.medianSeconds)}</Text>
                        </View>
                    </View>
                </View>
            );
        }

        return <Text style={styles.chartEmptyText}>Chart not supported on mobile.</Text>;
    };

    return (
        <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>{chart.title}</Text>
                {chart.description ? (
                    <Text style={styles.chartDescription}>{chart.description}</Text>
                ) : null}
            </View>
            {isLoading ? (
                <ActivityIndicator size="small" color={colors.brandIndigo} />
            ) : error ? (
                <Text style={styles.chartEmptyText}>Failed to load chart.</Text>
            ) : (
                content()
            )}
        </View>
    );
};

export const AnalyticsAdminScreen = () => {
    const queryClient = useQueryClient();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const { data: indexData, isLoading, error } = useFetchAnalyticsIndex();
    const [preset, setPreset] = useState<RangePreset>('month');
    const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);

    const range = useMemo(() => buildRangeFromPreset(preset), [preset]);
    const dashboards = useMemo(() => indexData?.dashboards ?? [], [indexData?.dashboards]);
    const charts = useMemo(() => indexData?.charts ?? [], [indexData?.charts]);
    const chartMap = useMemo(() => new Map(charts.map((chart) => [chart.id, chart])), [charts]);
    const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId) ?? dashboards[0] ?? null;
    const chartsForDashboard = selectedDashboard
        ? selectedDashboard.chartIds
            .map((id) => chartMap.get(id))
            .filter(Boolean) as AnalyticsChartDefinition[]
        : [];

    useEffect(() => {
        if (!selectedDashboardId && dashboards.length) {
            setSelectedDashboardId(dashboards[0].id);
        }
    }, [dashboards, selectedDashboardId]);

    const eventListConfig = eventListThemes.welcome;

    if (!isAdmin) {
        return (
            <View style={styles.standaloneContainer}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <FAIcon name="user-lock" size={22} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        Analytics dashboards are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

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

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.logoHalo}>
                        <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                    </View>
                    <Text style={styles.heroKicker}>Admin analytics</Text>
                    <Text style={styles.heroTitle}>Mobile analytics</Text>
                    <Text style={styles.heroSubtitle}>
                        Track users, events, funnels, and feature usage from your phone.
                    </Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Dashboards</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => {
                                queryClient.invalidateQueries({ queryKey: ['analytics-index'] });
                                queryClient.invalidateQueries({ queryKey: ['analytics-chart'] });
                            }}
                            disabled={isLoading}
                        >
                            <Ionicons name="refresh" size={16} color={colors.brandIndigo} />
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.segmentedWrap}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedContent}>
                            {dashboards.map((dashboard) => {
                                const isActive = dashboard.id === selectedDashboard?.id;
                                return (
                                    <TouchableOpacity
                                        key={dashboard.id}
                                        onPress={() => setSelectedDashboardId(dashboard.id)}
                                        style={[styles.segmentedButton, isActive && styles.segmentedButtonActive]}
                                    >
                                        <Text style={isActive ? styles.segmentedTextActive : styles.segmentedText}>
                                            {dashboard.title}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                    <View style={styles.rangeRow}>
                        {PRESET_OPTIONS.map((option) => {
                            const isActive = option.value === preset;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => setPreset(option.value)}
                                    style={[styles.rangePill, isActive && styles.rangePillActive]}
                                >
                                    <Text style={isActive ? styles.rangePillTextActive : styles.rangePillText}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <Text style={styles.rangeLabel}>{range.label}</Text>
                </View>

                {error && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartEmptyText}>Failed to load analytics index.</Text>
                    </View>
                )}
                {isLoading && (
                    <View style={styles.chartCard}>
                        <ActivityIndicator size="small" color={colors.brandIndigo} />
                    </View>
                )}

                {!isLoading && selectedDashboard && chartsForDashboard.map((chart) => (
                    <ChartCard
                        key={chart.id}
                        chart={chart}
                        range={range}
                    />
                ))}
            </ScrollView>
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
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    heroCard: {
        borderRadius: radius.hero,
        padding: spacing.xl,
        marginBottom: spacing.lgPlus,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        alignItems: 'flex-start',
        ...shadows.brandCard,
    },
    logoHalo: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.surfaceGlassStrong,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.mdPlus,
    },
    logo: {
        width: 34,
        height: 34,
    },
    heroKicker: {
        fontSize: fontSizes.sm,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: colors.textOnDarkMuted,
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
        maxWidth: 260,
    },
    section: {
        marginBottom: spacing.lgPlus,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.smPlus,
    },
    sectionTitle: {
        fontSize: fontSizes.sm,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
    },
    refreshButtonText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    segmentedWrap: {
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        padding: spacing.xs,
    },
    segmentedContent: {
        flexDirection: 'row',
    },
    segmentedButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        marginRight: spacing.xs,
    },
    segmentedButtonActive: {
        backgroundColor: colors.accentPurple,
        shadowColor: colors.black,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    segmentedText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    segmentedTextActive: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    rangeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.md,
    },
    rangePill: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.mdPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
    rangePillActive: {
        backgroundColor: colors.accentPurple,
        borderColor: colors.accentPurple,
    },
    rangePillText: {
        fontSize: fontSizes.sm,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    rangePillTextActive: {
        fontSize: fontSizes.sm,
        color: colors.white,
        fontFamily: fontFamilies.body,
        fontWeight: '700',
    },
    rangeLabel: {
        marginTop: spacing.sm,
        color: colors.textOnDarkMuted,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
    chartCard: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        padding: spacing.lg,
        ...shadows.card,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
    },
    chartHeader: {
        marginBottom: spacing.sm,
    },
    chartTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    chartDescription: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    chartEmptyText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    metricRow: {
        marginBottom: spacing.sm,
    },
    metricValue: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    metricLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    metricSubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    metricSubLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    miniChart: {
        marginTop: spacing.xs,
    },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 60,
        gap: 4,
    },
    barItem: {
        width: 8,
        borderRadius: 4,
    },
    list: {
        marginTop: spacing.xs,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderSubtle,
    },
    listRowLast: {
        borderBottomWidth: 0,
    },
    listRowBody: {
        flex: 1,
        marginRight: spacing.sm,
    },
    listRowLabel: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    listRowSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    listRowValue: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    barList: {
        marginTop: spacing.sm,
    },
    barRow: {
        marginBottom: spacing.smPlus,
    },
    barRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    barRowLabel: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    barRowValue: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    barTrack: {
        height: 6,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: radius.pill,
        marginTop: spacing.xs,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: radius.pill,
    },
    barMeta: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statChip: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        marginRight: spacing.sm,
    },
    statChipLast: {
        marginRight: 0,
    },
    statLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    statValue: {
        marginTop: spacing.xs,
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    standaloneContainer: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    lockedCard: {
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

export default AnalyticsAdminScreen;
