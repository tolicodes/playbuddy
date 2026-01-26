import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import {
    useAddPromoCodeToEvent,
    useDeletePromoCode,
    useDeletePromoCodeFromEvent,
    useFetchPromoCodes,
} from '../../common/db-axios/usePromoCodes';
import {
    useFetchPromoCodeRedemptionSummary,
    useFetchPromoCodeRedemptions,
    useFetchPromoCodeRedemptionStats,
} from '../../common/db-axios/usePromoCodeRedemptions';
import { CreatePromoCode } from './CreatePromoCode';
import type { PromoCode, PromoCodeRedemption } from '../../common/types/commonTypes';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

const parseRedemptionDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};
type ChartRange = 'last_30_days' | 'last_3_months' | 'all_time';

const PromoCodeStatsModal = ({
    open,
    promoCode,
    onClose,
}: {
    open: boolean;
    promoCode: PromoCode | null;
    onClose: () => void;
}) => {
    const promoCodeId = promoCode?.id ?? null;
    const { data: redemptions = [], isLoading: loadingRedemptions } = useFetchPromoCodeRedemptions(promoCodeId);
    const { data: stats, isLoading: loadingStats } = useFetchPromoCodeRedemptionStats(promoCodeId);
    const [chartRange, setChartRange] = useState<ChartRange>('last_30_days');

    useEffect(() => {
        if (open) setChartRange('last_30_days');
    }, [open, promoCodeId]);

    const parsedRedemptions = useMemo(() => {
        return (redemptions || [])
            .map((row: PromoCodeRedemption) => {
                const parsed = parseRedemptionDate(row.redemption_date);
                if (!parsed) return null;
                return {
                    ...row,
                    parsedDate: parsed,
                    grossAmount: Number(row.gross_amount || 0),
                    commissionAmount: Number(row.commission_amount || 0),
                };
            })
            .filter(Boolean) as Array<PromoCodeRedemption & { parsedDate: Date; grossAmount: number; commissionAmount: number }>;
    }, [redemptions]);

    const chartOptions = useMemo(() => {
        if (!stats) return null;
        const series = stats.series?.[chartRange] ?? [];
        if (!series.length) return null;
        const categories = series.map((point) => point.date);
        return {
            chart: { type: 'column', height: 260, backgroundColor: 'transparent', spacing: [12, 8, 12, 8] },
            title: { text: undefined },
            credits: { enabled: false },
            xAxis: {
                categories,
                labels: { style: { color: '#6b7280', fontSize: '11px' } },
                lineColor: '#e5e7eb',
                tickColor: '#cbd5f5',
            },
            yAxis: [
                {
                    title: { text: 'Redemptions' },
                    allowDecimals: false,
                    gridLineColor: '#eef2f7',
                },
                {
                    title: { text: 'Commission ($)' },
                    opposite: true,
                    gridLineColor: '#eef2f7',
                },
            ],
            legend: { align: 'left' },
            tooltip: { shared: true },
            plotOptions: { series: { animation: false, borderRadius: 4 } },
            series: [
                {
                    type: 'column',
                    name: 'Redemptions',
                    data: series.map((point) => point.redemption_count),
                    color: '#ef4444',
                    yAxis: 0,
                },
                {
                    type: 'column',
                    name: 'Commission',
                    data: series.map((point) => Number(point.commission_total.toFixed(2))),
                    color: '#10b981',
                    yAxis: 1,
                },
            ],
        } as Highcharts.Options;
    }, [stats, chartRange]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>Promo Code Stats — {promoCode?.promo_code || ''}</DialogTitle>
            <DialogContent>
                {loadingStats && <Typography variant="body2">Loading stats...</Typography>}
                {!loadingStats && stats && (
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch" flexWrap="wrap">
                            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, px: 2, py: 1.5, minWidth: 160 }}>
                                <Typography variant="caption" color="text.secondary">Redemptions</Typography>
                                <Typography variant="h6">{formatNumber(stats.totals.redemption_count)}</Typography>
                            </Box>
                            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, px: 2, py: 1.5, minWidth: 160 }}>
                                <Typography variant="caption" color="text.secondary">Gross total</Typography>
                                <Typography variant="h6">{formatCurrency(stats.totals.gross_total)}</Typography>
                            </Box>
                            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, px: 2, py: 1.5, minWidth: 180 }}>
                                <Typography variant="caption" color="text.secondary">Commission accumulated</Typography>
                                <Typography variant="h6">{formatCurrency(stats.totals.commission_total)}</Typography>
                            </Box>
                            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, px: 2, py: 1.5, minWidth: 160 }}>
                                <Typography variant="caption" color="text.secondary">Avg gross</Typography>
                                <Typography variant="h6">{formatCurrency(stats.totals.avg_gross)}</Typography>
                            </Box>
                            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, px: 2, py: 1.5, minWidth: 160 }}>
                                <Typography variant="caption" color="text.secondary">Avg commission</Typography>
                                <Typography variant="h6">{formatCurrency(stats.totals.avg_commission)}</Typography>
                            </Box>
                        </Stack>

                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1">Redemptions over time</Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={chartRange}
                                    onChange={(_e, next) => next && setChartRange(next)}
                                >
                                    <ToggleButton value="last_30_days">30d</ToggleButton>
                                    <ToggleButton value="last_3_months">3mo</ToggleButton>
                                    <ToggleButton value="all_time">All</ToggleButton>
                                </ToggleButtonGroup>
                            </Stack>
                            {chartOptions ? (
                                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                    <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">No data for this period.</Typography>
                            )}
                        </Stack>

                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Quarterly totals</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Quarter</TableCell>
                                        <TableCell align="right">Redemptions</TableCell>
                                        <TableCell align="right">Gross</TableCell>
                                        <TableCell align="right">Commission</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stats.quarters.map((row) => (
                                        <TableRow key={row.quarter}>
                                            <TableCell>{row.quarter}</TableCell>
                                            <TableCell align="right">{formatNumber(row.redemption_count)}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.gross_total)}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.commission_total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>

                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Redemption log</Typography>
                            {loadingRedemptions ? (
                                <Typography variant="body2">Loading redemptions...</Typography>
                            ) : !parsedRedemptions.length ? (
                                <Typography variant="body2" color="text.secondary">No redemptions found.</Typography>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell align="right">Gross amount</TableCell>
                                            <TableCell align="right">Commission amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {parsedRedemptions.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell>{row.redemption_date}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.grossAmount)}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.commissionAmount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export function PromoCodeEventManager() {
    const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<{ [eventId: string]: string }>({});
    const [deletingPromoCodeId, setDeletingPromoCodeId] = useState<string | null>(null);
    const [statsPromoCode, setStatsPromoCode] = useState<PromoCode | null>(null);

    const { data: organizers = [], isLoading: loadingOrganizers } = useFetchOrganizers();
    const { data: events = [], isLoading: loadingEvents } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
    });
    const { data: promoCodes = [], isLoading: loadingPromoCodes } = useFetchPromoCodes();
    const { data: redemptionSummary = [] } = useFetchPromoCodeRedemptionSummary(
        selectedOrganizerId ? Number(selectedOrganizerId) : null
    );

    const organizerPromoCodes = promoCodes.filter(pc => pc.organizer_id + '' === selectedOrganizerId);
    const filteredEvents = events.filter(e => e.organizer.id + '' === selectedOrganizerId);
    const filteredOrganizers = organizers.filter(org =>
        org.name.toLowerCase().includes(search.toLowerCase())
    );

    const redemptionSummaryMap = useMemo(() => {
        const map = new Map<string, number>();
        redemptionSummary.forEach((row) => {
            map.set(row.promo_code_id, row.redemption_count);
        });
        return map;
    }, [redemptionSummary]);

    const addPromo = useAddPromoCodeToEvent();
    const deletePromoFromEvent = useDeletePromoCodeFromEvent();
    const deletePromoCode = useDeletePromoCode();

    const handleAttach = ({ eventId, promoCodeId }: { eventId: string, promoCodeId: string }) => {
        addPromo.mutate({ eventId, promoCodeId });
    };

    const handleDetach = ({ eventId, promoCodeId }: { eventId: string, promoCodeId: string }) => {
        deletePromoFromEvent.mutate({ eventId, promoCodeId });
    };

    const handleDeletePromoCode = async (promoCodeId: string) => {
        const promo = promoCodes.find((code) => code.id === promoCodeId);
        const label = promo?.promo_code ? ` "${promo.promo_code}"` : '';
        if (!window.confirm(`Delete promo code${label}? This will remove it from any events.`)) {
            return;
        }
        setDeletingPromoCodeId(promoCodeId);
        try {
            const attachedEvents = filteredEvents.filter((event) =>
                event.promo_codes?.some((code) => code.id === promoCodeId)
            );
            for (const event of attachedEvents) {
                await deletePromoFromEvent.mutateAsync({
                    eventId: event.id + '',
                    promoCodeId,
                });
            }
            await deletePromoCode.mutateAsync(promoCodeId);
            setSelectedCodes((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((eventId) => {
                    if (next[eventId] === promoCodeId) {
                        delete next[eventId];
                    }
                });
                return next;
            });
        } catch (error) {
            console.error('Failed to delete promo code', error);
            alert('Unable to delete promo code. Remove it from events or deep links and try again.');
        } finally {
            setDeletingPromoCodeId(null);
        }
    };

    useEffect(() => {
        setStatsPromoCode(null);
    }, [selectedOrganizerId]);

    if (loadingOrganizers || loadingEvents || loadingPromoCodes) {
        return <p>Loading...</p>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Promo Code Manager</h2>

            <label>
                Search Organizer:{' '}
                <input
                    type="text"
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)} // allow click
                    style={{ width: '100%', padding: '8px', marginTop: '8px', marginBottom: '4px' }}
                />
            </label>

            {showDropdown && filteredOrganizers.length > 0 && (
                <ul style={{ border: '1px solid #ccc', borderRadius: 4, listStyle: 'none', padding: 0, maxHeight: 150, overflowY: 'auto' }}>
                    {filteredOrganizers.map(org => (
                        <li
                            key={org.id}
                            style={{ padding: '8px', cursor: 'pointer', backgroundColor: org.id + '' === selectedOrganizerId ? '#eee' : '#fff' }}
                            onClick={() => {
                                setSelectedOrganizerId(org.id + '');
                                setSearch(org.name);
                                setShowDropdown(false);
                            }}
                        >
                            {org.name}
                        </li>
                    ))}
                </ul>
            )}

            {selectedOrganizerId && (
                <div style={{ marginTop: '30px' }}>
                    <CreatePromoCode organizerId={selectedOrganizerId} />

                    {organizerPromoCodes.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <h3>Organizer Promo Codes</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {organizerPromoCodes.map((pc) => {
                                    const redemptionCount = redemptionSummaryMap.get(pc.id) || 0;
                                    return (
                                    <li key={pc.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                            <div>
                                                <strong>{pc.promo_code}</strong>{' '}
                                                <span style={{ color: '#555' }}>
                                                    {pc.discount_type === 'percent'
                                                        ? `${pc.discount}%`
                                                        : pc.discount_type === 'amount'
                                                            ? `$${pc.discount}`
                                                            : pc.discount_type}
                                                </span>
                                                <div style={{ marginTop: 4, color: '#6b7280', fontSize: 12 }}>
                                                    ID: {pc.id}
                                                </div>
                                                <div style={{ color: '#6b7280', fontSize: 12 }}>
                                                    Commission rate: {pc.commission_rate ?? 0}%
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {redemptionCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setStatsPromoCode(pc)}
                                                        style={{
                                                            color: '#1f2937',
                                                            border: '1px solid #cbd5f5',
                                                            background: '#f8fafc',
                                                            padding: '4px 10px',
                                                            borderRadius: 12,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Redemption stats
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePromoCode(pc.id)}
                                                    disabled={deletingPromoCodeId === pc.id}
                                                    style={{
                                                        color: '#b00020',
                                                        border: '1px solid #f2c4c4',
                                                        background: deletingPromoCodeId === pc.id ? '#fbe9e9' : 'transparent',
                                                        padding: '4px 10px',
                                                        borderRadius: 12,
                                                        cursor: deletingPromoCodeId === pc.id ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {deletingPromoCodeId === pc.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <h3>Events</h3>
                    {filteredEvents.map(event => {
                        const attached = event.promo_codes?.[0];

                        return (
                            <div key={event.id} style={{ borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                                <strong>{event.name}</strong>

                                {attached ? (
                                    <div style={{ marginTop: 8 }}>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                backgroundColor: '#f0f0f0',
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                marginRight: '8px',
                                            }}
                                        >
                                            {attached.promo_code}
                                            <button
                                                style={{
                                                    marginLeft: 8,
                                                    color: 'red',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() =>
                                                    handleDetach({ eventId: event.id + '', promoCodeId: attached.id })
                                                }
                                            >
                                                ×
                                            </button>
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 8 }}>
                                        <select
                                            value={selectedCodes[event.id] || ''}
                                            onChange={(e) =>
                                                setSelectedCodes(prev => ({ ...prev, [event.id]: e.target.value }))
                                            }
                                        >
                                            <option value="">-- Select Promo Code --</option>
                                            {organizerPromoCodes.map(pc => (
                                                <option key={pc.id} value={pc.id}>
                                                    {pc.promo_code}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() =>
                                                handleAttach({
                                                    eventId: event.id + '',
                                                    promoCodeId: selectedCodes[event.id] + '',
                                                })
                                            }
                                            style={{ marginLeft: '10px' }}
                                        >
                                            Attach
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <PromoCodeStatsModal
                open={!!statsPromoCode}
                promoCode={statsPromoCode}
                onClose={() => setStatsPromoCode(null)}
            />
        </div>
    );
}
