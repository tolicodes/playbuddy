import { Fragment, useMemo, type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { Event } from '../../common/types/commonTypes';

type EventsTableProps = {
    events: Event[];
    renderActions?: (event: Event) => ReactNode;
    actionsHeader?: ReactNode;
    emptyMessage?: string;
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

const toTimestamp = (value: string) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

export default function EventsTable({ events, renderActions, actionsHeader, emptyMessage }: EventsTableProps) {
    const groupedEvents = useMemo(() => {
        return events
            .slice()
            .sort((a, b) => toTimestamp(a.start_date) - toTimestamp(b.start_date))
            .reduce((groups, event) => {
                const date = new Date(event.start_date);
                const key = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : 'unknown';
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

    if (groupedEvents.length === 0) {
        return (
            <Typography color="text.secondary">
                {emptyMessage ?? 'No events available.'}
            </Typography>
        );
    }

    const showActions = Boolean(renderActions);
    const columnCount = showActions ? 5 : 4;

    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Organizer</TableCell>
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
                        {group.events.map((event) => (
                            <TableRow key={event.id}>
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
                                        <div
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 4,
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f8fafc',
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>{event.name}</TableCell>
                                <TableCell>{event.organizer?.name || '—'}</TableCell>
                                {showActions && (
                                    <TableCell>{renderActions?.(event)}</TableCell>
                                )}
                            </TableRow>
                        ))}
                    </Fragment>
                ))}
            </TableBody>
        </Table>
    );
}
