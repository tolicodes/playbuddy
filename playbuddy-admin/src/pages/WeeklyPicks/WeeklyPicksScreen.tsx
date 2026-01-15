import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment-timezone';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useFetchWishlistByCode } from '../../common/db-axios/useWishlist';
import {
    useFetchEvents,
    useFetchWeeklyPicksImageStatus,
    useFetchWeeklyPicksImagePart,
    useGenerateWeeklyPicksImage,
    useToggleWeeklyPickEvent,
} from '../../common/db-axios/useEvents';
import EventsTable from '../Events/EventsTable';
import { useCreateWeeklyPicksBranchLink } from '../../common/db-axios/useBranchLinks';
import { useAddDeepLink } from '../../common/db-axios/useDeepLinks';

const PB_SHARE_CODE = 'DCK9PD';
const BRANCH_MANAGER_URL = 'https://dashboard.branch.io/quick-links/manager?v=latest';
const BRANCH_TZ = 'America/New_York';

const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const buildDownloadName = (generatedAt: string | null | undefined, part: number) => {
    const base = generatedAt && generatedAt.length >= 10
        ? generatedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return `weekly_picks_${base.replace(/-/g, '_')}_part_${part}.jpg`;
};

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

type BranchFlowStep = 'idle' | 'creating_link' | 'creating_deep_link' | 'done' | 'error_link' | 'error_deep_link';

const normalizeLogs = (value: unknown) => (
    Array.isArray(value)
        ? value.filter((line): line is string => typeof line === 'string')
        : []
);

export default function WeeklyPicksScreen() {
    const { data: wishlist = [], isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { data: events = [], isLoading: eventsLoading, error: eventsError } = useFetchEvents();
    const {
        mutate: toggleWeeklyPickEvent,
        isPending: toggleWeeklyPickEventLoading,
        error: toggleWeeklyPickEventError,
    } = useToggleWeeklyPickEvent();
    const createWeeklyPicksBranchLink = useCreateWeeklyPicksBranchLink();
    const createWeeklyPicksDeepLink = useAddDeepLink();
    const generateWeeklyPicksImage = useGenerateWeeklyPicksImage();
    const fetchWeeklyPicksImagePart = useFetchWeeklyPicksImagePart();

    const [weekOffset, setWeekOffset] = useState(0);
    const [widthInput, setWidthInput] = useState('');
    const [scaleInput, setScaleInput] = useState('');
    const [limitInput, setLimitInput] = useState('');
    const [partCount, setPartCount] = useState(2);
    const [jpgUrls, setJpgUrls] = useState<string[]>([]);
    const [partsLoading, setPartsLoading] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generationLogs, setGenerationLogs] = useState<string[]>([]);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
    const [branchLink, setBranchLink] = useState<string | null>(null);
    const [branchFlowStep, setBranchFlowStep] = useState<BranchFlowStep>('idle');
    const [branchFlowError, setBranchFlowError] = useState<string | null>(null);
    const [branchFlowLogs, setBranchFlowLogs] = useState<string[]>([]);
    const [headless, setHeadless] = useState(true);

    const weeklyImageOptions = useMemo(() => ({
        weekOffset,
        width: parseOptionalNumber(widthInput),
        scale: parseOptionalNumber(scaleInput),
        limit: parseOptionalNumber(limitInput),
        partCount,
    }), [weekOffset, widthInput, scaleInput, limitInput, partCount]);

    const nextWeekLabel = useMemo(() => {
        const start = moment().tz(BRANCH_TZ).startOf('isoWeek').add(1, 'week');
        return getWeekRangeLabel(start);
    }, []);
    const defaultWeeklyPicksCampaign = useMemo(
        () => buildWeeklyPicksCampaignName(nextWeekLabel),
        [nextWeekLabel]
    );
    const defaultWeeklyPicksOgDescription = useMemo(
        () => buildWeeklyPicksOgDescription(nextWeekLabel),
        [nextWeekLabel]
    );
    const campaignNameRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const ogDescriptionRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const {
        data: weeklyImageStatus,
        isFetching: weeklyImageStatusLoading,
        error: weeklyImageStatusError,
        refetch: refetchWeeklyImageStatus,
    } = useFetchWeeklyPicksImageStatus(weeklyImageOptions);

    const wishlistSet = useMemo(() => new Set<number>(wishlist), [wishlist]);
    const isLoading = eventsLoading || wishlistLoading;
    const errorMessage = eventsError
        ? `Error fetching events: ${eventsError.message}`
        : wishlistError
            ? `Error fetching wishlist: ${wishlistError.message}`
            : null;
    const isGenerating = generateWeeklyPicksImage.isPending || partsLoading;

    useEffect(() => {
        return () => {
            jpgUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [jpgUrls]);

    const handleGenerateImage = async () => {
        setGenerationError(null);
        setGenerationLogs([]);
        setPartsLoading(true);
        try {
            const result = await generateWeeklyPicksImage.mutateAsync(weeklyImageOptions);
            setLastGeneratedAt(result.meta.generatedAt ?? null);
            setGenerationLogs(result.logs ?? []);
            const resolvedPartCount = result.meta.partCount ?? weeklyImageOptions.partCount ?? weeklyImageStatus?.partCount ?? 2;
            const partRequests = Array.from({ length: resolvedPartCount }, (_, index) =>
                fetchWeeklyPicksImagePart.mutateAsync({ options: weeklyImageOptions, part: index + 1 })
            );
            const parts = await Promise.all(partRequests);
            const nextUrls = parts.map((part) =>
                URL.createObjectURL(new Blob([part.buffer], { type: part.contentType ?? 'image/jpeg' }))
            );
            setJpgUrls((prev) => {
                prev.forEach((url) => URL.revokeObjectURL(url));
                return nextUrls;
            });
            await refetchWeeklyImageStatus();
        } catch (error) {
            const responseLogs = (error as any)?.response?.data?.logs;
            if (Array.isArray(responseLogs)) {
                setGenerationLogs(responseLogs.filter((line: unknown): line is string => typeof line === 'string'));
            }
            setGenerationError(error instanceof Error ? error.message : 'Unable to generate weekly picks image.');
        } finally {
            setPartsLoading(false);
        }
    };

    const createBranchQuickLink = async (
        campaignValue: string,
        descriptionValue: string,
        headlessValue: boolean
    ) => {
        console.log('[WeeklyPicks] Creating Branch quick link.');
        const response = await createWeeklyPicksBranchLink.mutateAsync({
            weekOffset: 1,
            title: campaignValue,
            socialTitle: campaignValue,
            socialDescription: descriptionValue,
            headless: headlessValue,
        });
        const link = response.link ?? null;
        console.log('[WeeklyPicks] Branch quick link created:', link);
        setBranchLink(link);
        return response;
    };

    const handleCreateBranchLink = async () => {
        setBranchFlowError(null);
        setBranchFlowLogs([]);
        setBranchFlowStep('creating_link');
        let failedAt: 'link' | 'deep' = 'link';
        const campaignValue = campaignNameRef.current?.value?.trim() || defaultWeeklyPicksCampaign;
        const descriptionValue = ogDescriptionRef.current?.value?.trim() || defaultWeeklyPicksOgDescription;
        try {
            const response = await createBranchQuickLink(campaignValue, descriptionValue, headless);
            const responseLogs = normalizeLogs(response.logs);
            if (responseLogs.length > 0) setBranchFlowLogs(responseLogs);
            const link = response.link;
            if (!link) {
                setBranchFlowStep('error_link');
                setBranchFlowError('Branch quick link was not returned.');
                return;
            }
            const slug = extractBranchSlug(link);
            if (!slug) {
                setBranchFlowStep('error_deep_link');
                setBranchFlowError('Unable to extract Branch slug.');
                return;
            }
            failedAt = 'deep';
            setBranchFlowStep('creating_deep_link');
            await createWeeklyPicksDeepLink.mutateAsync({
                campaign: campaignValue,
                slug,
                type: 'weekly_picks',
            });
            setBranchFlowStep('done');
        } catch (error: any) {
            const responseLogs = normalizeLogs(error?.response?.data?.logs);
            if (responseLogs.length > 0) setBranchFlowLogs(responseLogs);
            const status = error?.response?.status;
            const message = error?.response?.data?.error
                || error?.message
                || 'Unable to create Branch deep link.';
            const formatted = status ? `HTTP ${status}: ${message}` : message;
            const failedMessage = failedAt === 'link' ? 'Unable to create Branch link.' : 'Unable to create deep link.';
            setBranchFlowError(formatted);
            setBranchFlowStep(failedAt === 'link' ? 'error_link' : 'error_deep_link');
            console.error(`[WeeklyPicks] ${failedMessage}`, error);
        }
    };

    const handleOpenBranch = () => {
        window.open(BRANCH_MANAGER_URL, '_blank', 'noopener,noreferrer');
    };

    const handleOpenBranchLink = () => {
        if (!branchLink) return;
        window.open(branchLink, '_blank', 'noopener,noreferrer');
    };

    const handleDownload = (partIndex: number) => {
        const url = jpgUrls[partIndex];
        if (!url) return;
        const generatedAt = lastGeneratedAt ?? weeklyImageStatus?.generatedAt ?? null;
        const filename = buildDownloadName(generatedAt, partIndex + 1);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return <CircularProgress />;
    }

    if (errorMessage) {
        return <Typography color="error">{errorMessage}</Typography>;
    }

    const getBranchFlowStatus = (step: 'link' | 'deep') => {
        if (branchFlowStep === 'idle') return 'pending';
        if (branchFlowStep === 'creating_link') return step === 'link' ? 'active' : 'pending';
        if (branchFlowStep === 'creating_deep_link') return step === 'link' ? 'done' : 'active';
        if (branchFlowStep === 'done') return 'done';
        if (branchFlowStep === 'error_link') return step === 'link' ? 'error' : 'pending';
        return step === 'link' ? 'done' : 'error';
    };

    const branchFlowStatusLabel = {
        pending: 'Pending',
        active: 'In progress',
        done: 'Done',
        error: 'Failed',
    } as const;

    const branchFlowStatusColor = {
        pending: 'default',
        active: 'info',
        done: 'success',
        error: 'error',
    } as const;

    return (
        <Paper sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4">Weekly Picks</Typography>
                <Typography variant="body2" color="text.secondary">
                    Toggle weekly picks and review wishlist status alongside the main events list.
                </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 0.5 }}>Weekly Picks Image</Typography>
                <Typography variant="body2" color="text.secondary">
                    Generate JPG previews of the weekly picks image for sharing.
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <TextField
                            select
                            label="Week"
                            size="small"
                            value={weekOffset}
                            onChange={(event) => setWeekOffset(Number(event.target.value))}
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value={0}>This week</MenuItem>
                            <MenuItem value={1}>Next week</MenuItem>
                        </TextField>
                        <TextField
                            label="Width (px)"
                            size="small"
                            type="number"
                            value={widthInput}
                            onChange={(event) => setWidthInput(event.target.value)}
                            placeholder="Auto"
                        />
                        <TextField
                            label="Scale"
                            size="small"
                            type="number"
                            value={scaleInput}
                            onChange={(event) => setScaleInput(event.target.value)}
                            placeholder="Auto"
                        />
                        <TextField
                            label="Limit events"
                            size="small"
                            type="number"
                            value={limitInput}
                            onChange={(event) => setLimitInput(event.target.value)}
                            placeholder="All"
                        />
                        <TextField
                            select
                            label="JPG parts"
                            size="small"
                            value={partCount}
                            onChange={(event) => setPartCount(Number(event.target.value))}
                            sx={{ minWidth: 120 }}
                        >
                            <MenuItem value={1}>1 (single)</MenuItem>
                            <MenuItem value={2}>2 (split)</MenuItem>
                        </TextField>
                        <Button
                            variant="contained"
                            onClick={handleGenerateImage}
                            disabled={isGenerating}
                        >
                            {isGenerating ? 'Generating...' : `Generate JPG${partCount === 1 ? '' : 's'}`}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleDownload(0)}
                            disabled={!jpgUrls[0]}
                        >
                            Download JPG 1
                        </Button>
                        <Button
                            variant="text"
                            onClick={() => handleDownload(1)}
                            disabled={!jpgUrls[1]}
                        >
                            Download JPG 2
                        </Button>
                    </Stack>

                    {generationError && (
                        <Typography color="error">{generationError}</Typography>
                    )}
                    {weeklyImageStatusError && (
                        <Typography color="error">
                            Unable to load image status: {weeklyImageStatusError instanceof Error ? weeklyImageStatusError.message : 'Unknown error'}
                        </Typography>
                    )}

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2">Status</Typography>
                        {weeklyImageStatusLoading && <CircularProgress size={16} />}
                        {weeklyImageStatus && (
                            <>
                                <Chip
                                    size="small"
                                    label={weeklyImageStatus.cached ? 'Cached' : 'Not cached'}
                                    color={weeklyImageStatus.cached ? 'success' : 'default'}
                                />
                                {weeklyImageStatus.inProgress && (
                                    <Chip size="small" label="Generating" color="info" />
                                )}
                                {weeklyImageStatus.weekLabel && (
                                    <Chip size="small" label={`Week: ${weeklyImageStatus.weekLabel}`} />
                                )}
                                {weeklyImageStatus.width && weeklyImageStatus.height && (
                                    <Chip size="small" label={`Size: ${weeklyImageStatus.width}x${weeklyImageStatus.height}`} />
                                )}
                                {weeklyImageStatus.partCount && (
                                    <Chip size="small" label={`Parts: ${weeklyImageStatus.partCount}`} />
                                )}
                                {weeklyImageStatus.generatedAt && (
                                    <Chip size="small" label={`Generated: ${formatDateTime(weeklyImageStatus.generatedAt)}`} />
                                )}
                            </>
                        )}
                    </Stack>

                    {generationLogs.length > 0 && (
                        <Box
                            sx={{
                                backgroundColor: '#0f172a',
                                color: '#e2e8f0',
                                borderRadius: 2,
                                p: 2,
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                fontSize: 12,
                                maxHeight: 240,
                                overflow: 'auto',
                            }}
                        >
                            {generationLogs.join('\n')}
                        </Box>
                    )}

                    <Box
                        sx={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 2,
                            p: 2,
                            backgroundColor: '#f8fafc',
                        }}
                    >
                        {jpgUrls.length > 0 ? (
                            <Stack spacing={2}>
                                {jpgUrls.map((url, index) => (
                                    <Box key={`weekly-picks-part-${index}`}>
                                        <Typography variant="caption" color="text.secondary">
                                            Part {index + 1}
                                        </Typography>
                                        <img
                                            src={url}
                                            alt={`Weekly picks preview part ${index + 1}`}
                                            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, marginTop: 8 }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Typography color="text.secondary">Generate JPGs to preview them here.</Typography>
                        )}
                    </Box>
                </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 0.5 }}>Branch Weekly Picks Link</Typography>
                <Typography variant="body2" color="text.secondary">
                    Create the Branch quick link for next week&apos;s Weekly Picks.
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Campaign name"
                        size="small"
                        defaultValue={defaultWeeklyPicksCampaign}
                        inputRef={campaignNameRef}
                        fullWidth
                    />
                    <TextField
                        label="OG description"
                        size="small"
                        defaultValue={defaultWeeklyPicksOgDescription}
                        inputRef={ogDescriptionRef}
                        fullWidth
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={headless}
                                onChange={(event) => setHeadless(event.target.checked)}
                            />
                        }
                        label={headless ? 'Run headless (no browser UI)' : 'Run headed (show browser UI)'}
                    />
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={handleCreateBranchLink}
                            disabled={branchFlowStep === 'creating_link' || branchFlowStep === 'creating_deep_link'}
                        >
                            {(branchFlowStep === 'creating_link' || branchFlowStep === 'creating_deep_link')
                                ? 'Creating...'
                                : 'Create Branch Link'}
                        </Button>
                        <Button
                            variant="text"
                            onClick={handleOpenBranch}
                        >
                            Open Branch Quick Links
                        </Button>
                    </Stack>
                    <TextField
                        label="Branch short link"
                        size="small"
                        value={branchLink ?? ''}
                        InputProps={{ readOnly: true }}
                        placeholder="Create a link to populate this field."
                        fullWidth
                    />
                    {branchFlowStep !== 'idle' && (
                        <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    size="small"
                                    label={branchFlowStatusLabel[getBranchFlowStatus('link')]}
                                    color={branchFlowStatusColor[getBranchFlowStatus('link')]}
                                />
                                <Typography variant="body2">Create Branch quick link</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    size="small"
                                    label={branchFlowStatusLabel[getBranchFlowStatus('deep')]}
                                    color={branchFlowStatusColor[getBranchFlowStatus('deep')]}
                                />
                                <Typography variant="body2">Create deep link record</Typography>
                            </Stack>
                            {branchFlowError && (
                                <Typography color="error" variant="body2">
                                    {branchFlowError}
                                </Typography>
                            )}
                            {branchFlowStep === 'done' && (
                                <Typography color="success.main" variant="body2">
                                    Deep link created.
                                </Typography>
                            )}
                            {branchFlowStep !== 'idle' && branchFlowStep !== 'done' && (
                                <Box
                                    sx={{
                                        backgroundColor: '#0f172a',
                                        color: '#e2e8f0',
                                        borderRadius: 2,
                                        p: 2,
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: 12,
                                        maxHeight: 240,
                                        overflow: 'auto',
                                    }}
                                >
                                    {branchFlowLogs.length > 0 ? branchFlowLogs.join('\n') : 'Waiting for logs...'}
                                </Box>
                            )}
                        </Stack>
                    )}
                    {!branchLink && branchFlowStep === 'idle' && (
                        <Typography variant="body2" color="text.secondary">
                            No Branch link yet. This will create one first.
                        </Typography>
                    )}
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={handleOpenBranchLink}
                            disabled={!branchLink}
                        >
                            Open Branch Link
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            {toggleWeeklyPickEventError && (
                <Typography color="error" sx={{ mb: 2 }}>
                    Unable to update weekly picks. Please try again.
                </Typography>
            )}

            <EventsTable
                events={events}
                actionsHeader="Weekly Picks"
                emptyMessage="No events available."
                renderActions={(event) => {
                    const isWeeklyPick = !!event.weekly_pick;
                    const isInWishlist = wishlistSet.has(event.id);
                    return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={isWeeklyPick}
                                        onChange={() => toggleWeeklyPickEvent({ eventId: event.id, status: !isWeeklyPick })}
                                        disabled={toggleWeeklyPickEventLoading}
                                    />
                                }
                                label="Weekly pick"
                            />
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={isInWishlist}
                                        disabled
                                    />
                                }
                                label="Wishlist"
                            />
                        </Box>
                    );
                }}
            />
        </Paper>
    );
}
