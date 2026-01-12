import { useEffect, useMemo, useState } from 'react';
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

const PB_SHARE_CODE = 'DCK9PD';

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

export default function WeeklyPicksScreen() {
    const { data: wishlist = [], isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { data: events = [], isLoading: eventsLoading, error: eventsError } = useFetchEvents();
    const {
        mutate: toggleWeeklyPickEvent,
        isPending: toggleWeeklyPickEventLoading,
        error: toggleWeeklyPickEventError,
    } = useToggleWeeklyPickEvent();
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
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

    const weeklyImageOptions = useMemo(() => ({
        weekOffset,
        width: parseOptionalNumber(widthInput),
        scale: parseOptionalNumber(scaleInput),
        limit: parseOptionalNumber(limitInput),
        partCount,
    }), [weekOffset, widthInput, scaleInput, limitInput, partCount]);

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
        setPartsLoading(true);
        try {
            const result = await generateWeeklyPicksImage.mutateAsync(weeklyImageOptions);
            setLastGeneratedAt(result.meta.generatedAt ?? null);
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
            setGenerationError(error instanceof Error ? error.message : 'Unable to generate weekly picks image.');
        } finally {
            setPartsLoading(false);
        }
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
