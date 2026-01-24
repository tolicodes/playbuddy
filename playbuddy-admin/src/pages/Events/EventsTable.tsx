import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Chip, FormControl, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Celebration, Event as EventIcon, LocalDining } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateEvent } from '../../common/db-axios/useEvents';
import type { Event, EventTypes } from '../../common/types/commonTypes';
import { EVENT_TYPE_OPTIONS, formatEventTypeLabel, isKnownEventType } from './eventTypeOptions';

type EventsTableColumn = {
    id: string;
    label: ReactNode;
    render: (event: Event) => ReactNode;
    minWidth?: number;
    align?: 'left' | 'center' | 'right' | 'inherit' | 'justify';
};

type EventsTableProps = {
    events: Event[];
    renderActions?: (event: Event) => ReactNode;
    actionsHeader?: ReactNode;
    emptyMessage?: string;
    enableTypeEditor?: boolean;
    enableHorizontalScroll?: boolean;
    extraColumns?: EventsTableColumn[];
    visibleExtraColumnIds?: string[];
};

const formatEventDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) return '';
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const sameDay = startDate.toDateString() === endDate.toDateString();

    if (sameDay) {
        return `${startDate.toLocaleDateString(undefined, dateOptions)} ${startDate.toLocaleTimeString(undefined, timeOptions)}–${endDate.toLocaleTimeString(undefined, timeOptions)}`;
    }

    const startStr = startDate.toLocaleString(undefined, { ...dateOptions, ...timeOptions });
    const endStr = endDate.toLocaleString(undefined, { ...dateOptions, ...timeOptions });
    return `${startStr} – ${endStr}`;
};

const formatGroupDate = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const toLocalDateKey = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'unknown';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toTimestamp = (value: string) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

const getEventTypeIcon = (event: Event, typeOverride?: EventTypes) => {
    const resolvedType = typeOverride ?? event.type;
    if (event.play_party || resolvedType === 'play_party') {
        return <Celebration fontSize="small" color="disabled" />;
    }
    if (event.is_munch || resolvedType === 'munch') {
        return <LocalDining fontSize="small" color="disabled" />;
    }
    return <EventIcon fontSize="small" color="disabled" />;
};

const resolveEventType = (event: Event): EventTypes => {
    if (event.play_party || event.type === 'play_party') return 'play_party';
    if (event.is_munch || event.type === 'munch') return 'munch';
    return event.type || 'event';
};

export default function EventsTable({
    events,
    renderActions,
    actionsHeader,
    emptyMessage,
    enableTypeEditor = false,
    enableHorizontalScroll = false,
    extraColumns,
    visibleExtraColumnIds,
}: EventsTableProps) {
    const updateEventMutation = useUpdateEvent();
    const queryClient = useQueryClient();
    const [typeOverrides, setTypeOverrides] = useState<Record<number, EventTypes>>({});
    const [savingTypeIds, setSavingTypeIds] = useState<Record<number, boolean>>({});

    const groupedEvents = useMemo(() => {
        return events
            .slice()
            .sort((a, b) => toTimestamp(a.start_date) - toTimestamp(b.start_date))
            .reduce((groups, event) => {
                const key = toLocalDateKey(event.start_date);
                const label = formatGroupDate(event.start_date);
                const lastGroup = groups[groups.length - 1];
                if (!lastGroup || lastGroup.key !== key) {
                    groups.push({ key, label, events: [event] });
                } else {
                    lastGroup.events.push(event);
                }
                return groups;
            }, [] as { key: string; label: string; events: Event[] }[]);
    }, [events]);

    useEffect(() => {
        if (!enableTypeEditor) return;
        setTypeOverrides((prev) => {
            let changed = false;
            const next = { ...prev };
            events.forEach((event) => {
                const override = prev[event.id];
                if (override && override === resolveEventType(event)) {
                    delete next[event.id];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [enableTypeEditor, events]);

    const showActions = Boolean(renderActions);
    const showTypeEditor = Boolean(enableTypeEditor);
    const visibleExtraColumns = useMemo(() => {
        if (!extraColumns?.length) return [];
        if (!visibleExtraColumnIds) return extraColumns;
        const visible = new Set(visibleExtraColumnIds);
        return extraColumns.filter((column) => visible.has(column.id));
    }, [extraColumns, visibleExtraColumnIds]);
    const columnCount = 4 + visibleExtraColumns.length + (showTypeEditor ? 1 : 0) + (showActions ? 1 : 0);
    const isEmpty = groupedEvents.length === 0;

    if (isEmpty) {
        return (
            <Typography color="text.secondary">
                {emptyMessage ?? 'No events available.'}
            </Typography>
        );
    }

    const handleTypeChange = async (event: Event, nextType: EventTypes) => {
        const eventId = event.id;
        const currentType = typeOverrides[eventId] ?? resolveEventType(event);
        if (nextType === currentType) return;
        const previousOverride = typeOverrides[eventId];

        setTypeOverrides((prev) => ({ ...prev, [eventId]: nextType }));
        setSavingTypeIds((prev) => ({ ...prev, [eventId]: true }));

        const payload = {
            ...event,
            type: nextType,
            play_party: nextType === 'play_party',
            is_munch: nextType === 'munch',
        };

        try {
            await updateEventMutation.mutateAsync(payload);
            queryClient.invalidateQueries({ queryKey: ['events'] });
        } catch (error) {
            console.error(error);
            setTypeOverrides((prev) => {
                const next = { ...prev };
                if (previousOverride) {
                    next[eventId] = previousOverride;
                } else {
                    delete next[eventId];
                }
                return next;
            });
            alert('Failed to update event type');
        } finally {
            setSavingTypeIds((prev) => {
                const next = { ...prev };
                delete next[eventId];
                return next;
            });
        }
    };

    const minTableWidth = showTypeEditor ? 1200 : 1000;
    const table = (
        <Table
            sx={
                enableHorizontalScroll
                    ? { minWidth: minTableWidth + visibleExtraColumns.length * 140 }
                    : undefined
            }
        >
            <TableHead>
                <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Organizer</TableCell>
                    {visibleExtraColumns.map((column) => (
                        <TableCell
                            key={column.id}
                            sx={column.minWidth ? { minWidth: column.minWidth } : undefined}
                            align={column.align}
                        >
                            {column.label}
                        </TableCell>
                    ))}
                    {showTypeEditor && <TableCell>Type</TableCell>}
                    {showActions && (
                        <TableCell>{actionsHeader ?? 'Actions'}</TableCell>
                    )}
                </TableRow>
            </TableHead>
            <TableBody>
                {groupedEvents.map((group) => (
                    <Fragment key={group.key}>
                        <TableRow>
                            <TableCell
                                colSpan={columnCount}
                                sx={{
                                    backgroundColor: '#f8fafc',
                                    fontWeight: 600,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                {group.label}
                            </TableCell>
                        </TableRow>
                        {group.events.map((event) => {
                            const hiddenEvent = !!event.hidden;
                            const hiddenOrganizer = !!event.organizer?.hidden;
                            const isHidden = hiddenEvent || hiddenOrganizer;
                            const isRejected = event.approval_status === 'rejected';
                            const resolvedType = typeOverrides[event.id] ?? resolveEventType(event);
                            const isSavingType = !!savingTypeIds[event.id];
                            const isLegacyType = !isKnownEventType(resolvedType);
                            const rowSx = {
                                ...(isHidden ? { opacity: 0.7 } : null),
                                ...(isRejected ? {
                                    '& td': {
                                        borderTop: '1px solid #fecaca',
                                        borderBottom: '1px solid #fecaca',
                                    },
                                    '& td:first-of-type': { borderLeft: '2px solid #ef4444' },
                                    '& td:last-of-type': { borderRight: '2px solid #ef4444' },
                                } : null),
                            };

                            return (
                            <TableRow key={event.id} sx={rowSx}>
                                <TableCell>{formatEventDate(event.start_date, event.end_date)}</TableCell>
                                <TableCell>
                                    {event.image_url ? (
                                        <img
                                            src={event.image_url}
                                            alt={event.name}
                                            loading="lazy"
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 4,
                                                objectFit: 'cover',
                                                border: '1px solid #e5e7eb',
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '4px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f8fafc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {getEventTypeIcon(event, resolvedType)}
                                        </Box>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {event.name}
                                        </Typography>
                                        {hiddenEvent && <Chip size="small" label="Hidden event" variant="outlined" />}
                                        {hiddenOrganizer && <Chip size="small" label="Hidden organizer" variant="outlined" />}
                                    </Box>
                                </TableCell>
                                <TableCell>{event.organizer?.name || '—'}</TableCell>
                                {visibleExtraColumns.map((column) => (
                                    <TableCell key={`${event.id}-${column.id}`} align={column.align}>
                                        {column.render(event)}
                                    </TableCell>
                                ))}
                                {showTypeEditor && (
                                    <TableCell>
                                        <FormControl size="small" sx={{ minWidth: 160 }}>
                                            <Select
                                                value={resolvedType}
                                                onChange={(e) => handleTypeChange(event, e.target.value as EventTypes)}
                                                disabled={isSavingType}
                                            >
                                                {isLegacyType && (
                                                    <MenuItem value={resolvedType}>
                                                        {`${formatEventTypeLabel(resolvedType)} (legacy)`}
                                                    </MenuItem>
                                                )}
                                                {EVENT_TYPE_OPTIONS.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                )}
                                {showActions && (
                                    <TableCell>{renderActions?.(event)}</TableCell>
                                )}
                            </TableRow>
                            );
                        })}
                    </Fragment>
                ))}
            </TableBody>
        </Table>
    );

    if (enableHorizontalScroll) {
        return (
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
                {table}
            </Box>
        );
    }

    return table;
}
