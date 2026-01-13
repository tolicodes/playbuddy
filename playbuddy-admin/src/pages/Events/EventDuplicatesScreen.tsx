import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Checkbox,
    Divider,
    FormControlLabel,
    Link,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useFindEventDuplicates } from '../../common/db-axios/useEventDuplicates';
import { useMergeEvent } from '../../common/db-axios/useMergeEvent';
import type { Event, EventDuplicateCandidate, EventDuplicateMode } from '../../common/types/commonTypes';

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const formatDateRange = (start?: string, end?: string) => {
    if (!start) return 'Unknown date';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    if (!Number.isFinite(startDate.getTime())) return 'Unknown date';
    const startLabel = startDate.toLocaleString();
    if (!endDate || !Number.isFinite(endDate.getTime())) return startLabel;
    return `${startLabel} - ${endDate.toLocaleString()}`;
};

const getPairKey = (candidate: EventDuplicateCandidate) => {
    const idA = candidate.eventA.id;
    const idB = candidate.eventB.id;
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
};

type MergeDirection = 'A' | 'B';

const formatDuration = (seconds?: number | null) => {
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 'n/a';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const estimateDurationSeconds = (mode: EventDuplicateMode, limit: number) => {
    const capped = Math.max(1, Math.min(limit, 200));
    if (mode === 'heuristic') {
        return Math.max(2, Math.ceil(capped / 200) * 2);
    }
    const concurrency = 3;
    const perCandidateSeconds = 2.5;
    const batches = Math.ceil(capped / concurrency);
    return Math.max(4, Math.ceil(batches * perCandidateSeconds + 2));
};

const EventSummary = ({ label, event }: { label: string; event: Event }) => (
    <Stack spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
            {label} • #{event.id}
        </Typography>
        <Typography variant="h6">{event.name}</Typography>
        <Typography variant="body2">{formatDateRange(event.start_date, event.end_date)}</Typography>
        <Typography variant="body2">
            {event.organizer?.name || 'Organizer unknown'}
        </Typography>
        <Typography variant="body2">{event.location || 'Location TBD'}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {event.visibility && <Chip size="small" label={event.visibility} />}
            {event.approval_status && <Chip size="small" label={event.approval_status} />}
            {event.hidden ? <Chip size="small" label="hidden" /> : null}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Link component={RouterLink} to={`/events/${event.id}`} underline="hover">
                Edit
            </Link>
            {event.event_url && (
                <Link href={event.event_url} target="_blank" rel="noreferrer" underline="hover">
                    Event URL
                </Link>
            )}
            {event.ticket_url && (
                <Link href={event.ticket_url} target="_blank" rel="noreferrer" underline="hover">
                    Ticket URL
                </Link>
            )}
        </Stack>
    </Stack>
);

export default function EventDuplicatesScreen() {
    const findDuplicates = useFindEventDuplicates();
    const mergeEvent = useMergeEvent();

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return toDateInputValue(d);
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 180);
        return toDateInputValue(d);
    });
    const [maxHoursApart, setMaxHoursApart] = useState(3);
    const [minScore, setMinScore] = useState(0.72);
    const [limit, setLimit] = useState(50);
    const [mode, setMode] = useState<EventDuplicateMode>('hybrid');
    const [includeHidden, setIncludeHidden] = useState(true);
    const [includePrivate, setIncludePrivate] = useState(true);
    const [includeUnapproved, setIncludeUnapproved] = useState(true);

    const [results, setResults] = useState<EventDuplicateCandidate[]>([]);
    const [meta, setMeta] = useState<{ generatedAt: string; totalCandidates: number; mode: EventDuplicateMode; warnings?: string[] } | null>(null);
    const [ignored, setIgnored] = useState<Record<string, boolean>>({});
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [mergeDirection, setMergeDirection] = useState<Record<string, MergeDirection>>({});
    const [batchProgress, setBatchProgress] = useState<{ total: number; completed: number } | null>(null);
    const [progressMeta, setProgressMeta] = useState<{ startedAt: number; etaSec: number; elapsedSec: number } | null>(null);

    const visibleResults = useMemo(() => {
        return results.filter((candidate) => !ignored[getPairKey(candidate)]);
    }, [results, ignored]);
    const selectableKeys = useMemo(() => visibleResults.map((candidate) => getPairKey(candidate)), [visibleResults]);
    const allSelected = selectableKeys.length > 0 && selectableKeys.every((key) => selected[key]);
    const someSelected = selectableKeys.some((key) => selected[key]);
    const selectedCandidates = useMemo(() => {
        const selectedKeys = new Set(Object.keys(selected).filter((key) => selected[key]));
        if (selectedKeys.size === 0) return [];
        return results.filter((candidate) => selectedKeys.has(getPairKey(candidate)));
    }, [results, selected]);
    const selectedCount = selectedCandidates.length;
    const isBatchMerging = !!batchProgress;
    const isSelectionDisabled = findDuplicates.isPending || isBatchMerging || mergeEvent.isPending;

    useEffect(() => {
        if (!findDuplicates.isPending || !progressMeta?.startedAt) return;
        const interval = setInterval(() => {
            setProgressMeta((prev) => {
                if (!prev) return prev;
                const elapsedSec = Math.floor((Date.now() - prev.startedAt) / 1000);
                return { ...prev, elapsedSec };
            });
        }, 500);
        return () => clearInterval(interval);
    }, [findDuplicates.isPending, progressMeta?.startedAt]);

    const runSearch = async () => {
        const etaSec = estimateDurationSeconds(mode, limit);
        setProgressMeta({ startedAt: Date.now(), etaSec, elapsedSec: 0 });
        try {
            const data = await findDuplicates.mutateAsync({
                startDate,
                endDate,
                maxHoursApart,
                minScore,
                limit,
                mode,
                includeHidden,
                includePrivate,
                includeUnapproved,
            });
            setResults(data.candidates || []);
            setMeta({
                generatedAt: data.generatedAt,
                totalCandidates: data.totalCandidates,
                mode: data.mode,
                warnings: data.warnings,
            });
            setIgnored({});
            const nextSelected: Record<string, boolean> = {};
            const nextDirections: Record<string, MergeDirection> = {};
            (data.candidates || []).forEach((candidate) => {
                const key = getPairKey(candidate);
                nextSelected[key] = true;
                nextDirections[key] = 'A';
            });
            setSelected(nextSelected);
            setMergeDirection(nextDirections);
        } catch (err: any) {
            window.alert(err?.message || 'Failed to fetch duplicates.');
        } finally {
            setProgressMeta(null);
        }
    };

    const toggleSelected = (candidate: EventDuplicateCandidate, checked: boolean) => {
        const key = getPairKey(candidate);
        if (!checked) {
            setSelected((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            setMergeDirection((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            return;
        }
        setSelected((prev) => ({ ...prev, [key]: true }));
        setMergeDirection((prev) => ({ ...prev, [key]: prev[key] ?? 'A' }));
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!selectableKeys.length) return;
        if (!checked) {
            const keys = new Set(selectableKeys);
            setSelected((prev) => {
                const next = { ...prev };
                keys.forEach((key) => delete next[key]);
                return next;
            });
            setMergeDirection((prev) => {
                const next = { ...prev };
                keys.forEach((key) => delete next[key]);
                return next;
            });
            return;
        }
        const nextSelected: Record<string, boolean> = {};
        const nextDirections: Record<string, MergeDirection> = {};
        selectableKeys.forEach((key) => {
            nextSelected[key] = true;
            nextDirections[key] = 'A';
        });
        setSelected(nextSelected);
        setMergeDirection(nextDirections);
    };

    const setDirection = (candidate: EventDuplicateCandidate, direction: MergeDirection | null) => {
        if (!direction) return;
        const key = getPairKey(candidate);
        setMergeDirection((prev) => ({ ...prev, [key]: direction }));
    };

    const ignoreCandidate = (candidate: EventDuplicateCandidate) => {
        const key = getPairKey(candidate);
        setIgnored((prev) => ({ ...prev, [key]: true }));
        setSelected((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setMergeDirection((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleMergeSelected = async () => {
        if (!selectedCount) return;
        const confirmed = window.confirm(
            `Merge ${selectedCount} selected event pairs?\n\nThis will move linked data to the target events and delete the source events.`
        );
        if (!confirmed) return;
        const warnings: string[] = [];
        const toMerge = [...selectedCandidates];
        setBatchProgress({ total: toMerge.length, completed: 0 });
        for (let i = 0; i < toMerge.length; i += 1) {
            const candidate = toMerge[i];
            const key = getPairKey(candidate);
            const direction = mergeDirection[key] ?? 'A';
            const source = direction === 'A' ? candidate.eventB : candidate.eventA;
            const target = direction === 'A' ? candidate.eventA : candidate.eventB;
            let hadError = false;
            try {
                const result = await mergeEvent.mutateAsync({
                    sourceEventId: source.id,
                    targetEventId: target.id,
                    deleteSource: true,
                });
                if (result?.warnings?.length) {
                    warnings.push(...result.warnings.map((warn) => `${warn.table}: ${warn.message}`));
                }
            } catch (err: any) {
                hadError = true;
                warnings.push(`Event ${source.id} -> ${target.id}: ${err?.message || 'Failed to merge'}`);
            }
            if (!hadError) {
                setResults((prev) => prev.filter((item) => getPairKey(item) !== key));
                setIgnored((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                setSelected((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                setMergeDirection((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }
            setBatchProgress((prev) => prev ? { ...prev, completed: i + 1 } : prev);
        }
        setBatchProgress(null);
        if (warnings.length) {
            window.alert(`Merge completed with warnings:\n${warnings.join('\n')}`);
        }
    };

    return (
        <Box p={4} sx={{ background: '#f8fafc', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom>Event Duplicate Finder</Typography>
            <Typography color="text.secondary" gutterBottom>
                Use heuristics or AI checks to find likely duplicate event listings.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, position: 'sticky', top: { xs: 56, sm: 64 }, zIndex: 10 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
                    <Typography variant="h6">Batch merge</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControlLabel
                            control={(
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={!allSelected && someSelected}
                                    onChange={(e) => toggleSelectAll(e.target.checked)}
                                    disabled={isSelectionDisabled || visibleResults.length === 0}
                                />
                            )}
                            label="Select all"
                        />
                        {batchProgress && (
                            <Typography variant="body2" color="text.secondary">
                                Merging {batchProgress.completed}/{batchProgress.total}
                            </Typography>
                        )}
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleMergeSelected}
                            disabled={!selectedCount || isSelectionDisabled}
                            sx={{ px: 4, py: 1.25, fontSize: '1rem' }}
                        >
                            Merge Selected ({selectedCount})
                        </Button>
                    </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                    <TextField
                        label="Start date"
                        type="date"
                        size="small"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="End date"
                        type="date"
                        size="small"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Max hours apart"
                        type="number"
                        size="small"
                        value={maxHoursApart}
                        onChange={(e) => setMaxHoursApart(Number(e.target.value))}
                        inputProps={{ min: 1, step: 1 }}
                        helperText="Fixed at 3 hours"
                        disabled
                    />
                    <TextField
                        label="Min score"
                        type="number"
                        size="small"
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                    />
                    <TextField
                        label="Limit"
                        type="number"
                        size="small"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        inputProps={{ min: 1, step: 1 }}
                    />
                    <TextField
                        label="Mode"
                        select
                        size="small"
                        value={mode}
                        onChange={(e) => setMode(e.target.value as EventDuplicateMode)}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="heuristic">Heuristic</MenuItem>
                        <MenuItem value="hybrid">Hybrid (AI check)</MenuItem>
                        <MenuItem value="ai">AI only</MenuItem>
                    </TextField>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" mt={2}>
                    <FormControlLabel
                        control={<Switch checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />}
                        label="Include hidden"
                    />
                    <FormControlLabel
                        control={<Switch checked={includePrivate} onChange={(e) => setIncludePrivate(e.target.checked)} />}
                        label="Include private"
                    />
                    <FormControlLabel
                        control={<Switch checked={includeUnapproved} onChange={(e) => setIncludeUnapproved(e.target.checked)} />}
                        label="Include unapproved"
                    />
                    <Button variant="contained" onClick={runSearch} disabled={findDuplicates.isPending || isBatchMerging}>
                        Find duplicates
                    </Button>
                    {meta && (
                        <Typography variant="body2" color="text.secondary">
                            {meta.totalCandidates} candidates • mode {meta.mode} • {new Date(meta.generatedAt).toLocaleString()}
                        </Typography>
                    )}
                </Stack>
                {findDuplicates.isPending && progressMeta && (
                    <Box mt={2}>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(95, (progressMeta.elapsedSec / Math.max(progressMeta.etaSec, 1)) * 100)}
                        />
                        <Stack direction="row" spacing={2} mt={1}>
                            <Typography variant="caption" color="text.secondary">
                                Elapsed: {formatDuration(progressMeta.elapsedSec)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ETA: ~{formatDuration(progressMeta.etaSec)}
                            </Typography>
                        </Stack>
                    </Box>
                )}
                {meta?.warnings?.length ? (
                    <Box mt={2}>
                        {meta.warnings.map((warning, idx) => (
                            <Typography key={idx} variant="body2" color="warning.main">
                                {warning}
                            </Typography>
                        ))}
                    </Box>
                ) : null}
            </Paper>

            {visibleResults.length === 0 ? (
                <Typography color="text.secondary">
                    {results.length === 0 ? 'Run a search to see duplicates.' : 'No matches remain after filtering.'}
                </Typography>
            ) : (
                <Stack spacing={2}>
                    {visibleResults.map((candidate) => {
                        const aiLabel = candidate.ai?.decision ? `AI: ${candidate.ai.decision}` : null;
                        const aiDetail = candidate.ai?.confidence !== null && candidate.ai?.confidence !== undefined
                            ? `${aiLabel} (${candidate.ai.confidence.toFixed(2)})`
                            : aiLabel;
                        const key = getPairKey(candidate);
                        const isChecked = !!selected[key];
                        const direction = mergeDirection[key] ?? 'A';
                        return (
                            <Paper key={getPairKey(candidate)} sx={{ p: 2 }}>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
                                    <Box flex={1}>
                                        <EventSummary label="Event A" event={candidate.eventA} />
                                    </Box>
                                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                                    <Box flex={1}>
                                        <EventSummary label="Event B" event={candidate.eventB} />
                                    </Box>
                                    <Box sx={{ minWidth: 260 }}>
                                        <Stack spacing={1}>
                                            <Chip label={`score ${candidate.score.toFixed(2)}`} />
                                            {aiDetail && <Chip color="info" label={aiDetail} />}
                                            {candidate.reasons.length > 0 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {candidate.reasons.join(', ')}
                                                </Typography>
                                            )}
                                            <FormControlLabel
                                                control={(
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onChange={(e) => toggleSelected(candidate, e.target.checked)}
                                                        disabled={isSelectionDisabled}
                                                    />
                                                )}
                                                label="Select for merge"
                                            />
                                            <ToggleButtonGroup
                                                value={direction}
                                                exclusive
                                                size="small"
                                                onChange={(_e, value) => setDirection(candidate, value)}
                                                disabled={!isChecked || isSelectionDisabled}
                                            >
                                                <ToggleButton value="A">Merge into A</ToggleButton>
                                                <ToggleButton value="B">Merge into B</ToggleButton>
                                            </ToggleButtonGroup>
                                            <Button
                                                size="small"
                                                onClick={() => ignoreCandidate(candidate)}
                                                disabled={isSelectionDisabled}
                                            >
                                                Ignore
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
}
