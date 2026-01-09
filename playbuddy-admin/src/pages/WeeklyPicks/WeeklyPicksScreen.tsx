import { useMemo } from 'react';
import { Box, Checkbox, CircularProgress, FormControlLabel, Paper, Typography } from '@mui/material';
import { useFetchWishlistByCode } from '../../common/db-axios/useWishlist';
import { useFetchEvents, useToggleWeeklyPickEvent } from '../../common/db-axios/useEvents';
import EventsTable from '../Events/EventsTable';

const PB_SHARE_CODE = 'DCK9PD';

export default function WeeklyPicksScreen() {
    const { data: wishlist = [], isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { data: events = [], isLoading: eventsLoading, error: eventsError } = useFetchEvents();
    const {
        mutate: toggleWeeklyPickEvent,
        isPending: toggleWeeklyPickEventLoading,
        error: toggleWeeklyPickEventError,
    } = useToggleWeeklyPickEvent();

    const wishlistSet = useMemo(() => new Set<number>(wishlist), [wishlist]);
    const isLoading = eventsLoading || wishlistLoading;
    const errorMessage = eventsError
        ? `Error fetching events: ${eventsError.message}`
        : wishlistError
            ? `Error fetching wishlist: ${wishlistError.message}`
            : null;

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
