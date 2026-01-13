import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE, type ActiveEventType } from '../../common/types/commonTypes';

type KnownEventType = ActiveEventType | typeof FALLBACK_EVENT_TYPE;

const EVENT_TYPE_LABELS: Record<KnownEventType, string> = {
    event: 'Event',
    workshop: 'Workshop',
    munch: 'Munch',
    play_party: 'Play Party',
    festival: 'Festival',
    conference: 'Conference',
    retreat: 'Retreat',
};

export const EVENT_TYPE_OPTIONS = [FALLBACK_EVENT_TYPE, ...ACTIVE_EVENT_TYPES].map((value) => ({
    value,
    label: EVENT_TYPE_LABELS[value],
}));

export const isActiveEventType = (value?: string | null): value is ActiveEventType => {
    if (!value) return false;
    return ACTIVE_EVENT_TYPES.includes(value as ActiveEventType);
};

export const isKnownEventType = (value?: string | null): value is KnownEventType => {
    if (!value) return false;
    return value === FALLBACK_EVENT_TYPE || isActiveEventType(value);
};

export const formatEventTypeLabel = (value?: string | null) => {
    if (!value) return '';
    if (isKnownEventType(value)) return EVENT_TYPE_LABELS[value];
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};
