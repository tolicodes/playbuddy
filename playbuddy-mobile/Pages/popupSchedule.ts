import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_MS = 24 * 60 * 60 * 1000;
export const POPUP_INTERVAL_DAYS = 3;
export const POPUP_INTERVAL_MS = POPUP_INTERVAL_DAYS * DAY_MS;
const DEFAULT_SNOOZE_MS = 14 * DAY_MS;
const LIST_VIEW_INTRO_DELAY_MS = 3 * 60 * 1000;
const CALENDAR_ADD_COACH_DELAY_MS = 5 * 60 * 1000;
const NEWSLETTER_DELAY_MS = 3 * DAY_MS;
const SHARE_CALENDAR_DELAY_MS = NEWSLETTER_DELAY_MS;
const EDGE_PLAY_DELAY_MS = 6 * DAY_MS;
const RATE_APP_DELAY_MS = 9 * DAY_MS;
const DISCOVER_GAME_DELAY_MS = 12 * DAY_MS;
const BUDDY_LIST_COACH_DELAY_MS = DISCOVER_GAME_DELAY_MS + POPUP_INTERVAL_MS;
const NOTIFICATIONS_PROMPT_DELAY_MS = RATE_APP_DELAY_MS;

export const POPUP_SCHEDULE = [
    {
        id: 'list_view_intro',
        label: 'Switch to classic view',
        initialDelayMs: LIST_VIEW_INTRO_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: false,
    },
    {
        id: 'calendar_add_coach',
        label: 'Add To Calendar',
        initialDelayMs: CALENDAR_ADD_COACH_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: false,
    },
    {
        id: 'share_calendar',
        label: 'Share your calendar',
        initialDelayMs: SHARE_CALENDAR_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: true,
    },
    {
        id: 'newsletter_signup',
        label: 'Weekly newsletter',
        initialDelayMs: NEWSLETTER_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: true,
    },
    {
        id: 'whatsapp_group',
        label: 'EdgePlay WhatsApp group',
        initialDelayMs: EDGE_PLAY_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: true,
    },
    {
        id: 'rate_app',
        label: 'Rate the app',
        initialDelayMs: RATE_APP_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: true,
    },
    {
        id: 'notifications_prompt',
        label: 'Enable notifications',
        initialDelayMs: NOTIFICATIONS_PROMPT_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: false,
    },
    {
        id: 'discover_game',
        label: 'Try Discover Game',
        initialDelayMs: DISCOVER_GAME_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: true,
    },
    {
        id: 'buddy_list_coach',
        label: 'Buddy list coach',
        initialDelayMs: BUDDY_LIST_COACH_DELAY_MS,
        snoozeMs: DEFAULT_SNOOZE_MS,
        useInterval: true,
    },
] as const;

export type PopupId = typeof POPUP_SCHEDULE[number]['id'];

export type PopupState = {
    dismissed?: boolean;
    snoozeUntil?: number;
    lastShownAt?: number;
};

export type PopupManagerState = {
    firstSeenAt?: number;
    lastPopupShownAt?: number;
    popups: Record<PopupId, PopupState>;
};

export const POPUP_STORAGE_KEY = 'popup_manager_state_v1';
export const POPUP_FORCE_KEY = 'popup_manager_force_popup';
export const LEGACY_TIMER_KEY = 'edgeplay_modal_timer';
export const LEGACY_HIDE_KEY = 'edgeplay_modal_hide';
export const LEGACY_SNOOZE_KEY = 'edgeplay_modal_snooze';

export const POPUP_ORDER: PopupId[] = POPUP_SCHEDULE.map((popup) => popup.id);

export const POPUP_CONFIG: Record<PopupId, typeof POPUP_SCHEDULE[number]> = POPUP_SCHEDULE.reduce(
    (acc, popup) => {
        acc[popup.id] = popup;
        return acc;
    },
    {} as Record<PopupId, typeof POPUP_SCHEDULE[number]>
);

const createPopupMap = (popups?: Partial<Record<PopupId, PopupState>>) =>
    POPUP_ORDER.reduce((acc, id) => {
        acc[id] = popups?.[id] ?? {};
        return acc;
    }, {} as Record<PopupId, PopupState>);

const findLatestPopupShown = (popups: Record<PopupId, PopupState>) => {
    let latestId: PopupId | null = null;
    let latestAt = 0;

    POPUP_ORDER.forEach((id) => {
        const shownAt = popups[id]?.lastShownAt ?? 0;
        if (shownAt > latestAt) {
            latestAt = shownAt;
            latestId = id;
        }
    });

    return latestId ? { id: latestId, at: latestAt } : null;
};

export const createEmptyPopupManagerState = (): PopupManagerState => ({
    firstSeenAt: undefined,
    lastPopupShownAt: undefined,
    popups: createPopupMap(),
});

export const normalizePopupManagerState = (state: PopupManagerState): PopupManagerState => {
    const popups = createPopupMap(state.popups);
    const latest = findLatestPopupShown(popups);
    const latestAt = latest?.at ?? 0;
    const lastPopupShownAt = Math.max(state.lastPopupShownAt ?? 0, latestAt) || undefined;

    return {
        firstSeenAt: state.firstSeenAt,
        lastPopupShownAt,
        popups,
    };
};

export const parsePopupManagerState = (raw: string | null): PopupManagerState => {
    if (!raw) return createEmptyPopupManagerState();

    try {
        return normalizePopupManagerState(JSON.parse(raw) as PopupManagerState);
    } catch {
        return createEmptyPopupManagerState();
    }
};

export const savePopupManagerState = async (state: PopupManagerState) =>
    AsyncStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(state));

export const getForcedPopupId = async (): Promise<PopupId | null> => {
    const raw = await AsyncStorage.getItem(POPUP_FORCE_KEY);
    if (!raw) return null;
    const id = raw as PopupId;
    if (!POPUP_CONFIG[id]) {
        await AsyncStorage.removeItem(POPUP_FORCE_KEY);
        return null;
    }
    return id;
};

export const setForcedPopupId = async (id: PopupId) =>
    AsyncStorage.setItem(POPUP_FORCE_KEY, id);

export const clearForcedPopupId = async () =>
    AsyncStorage.removeItem(POPUP_FORCE_KEY);

export const resetPopupManagerState = async () => {
    const next = createEmptyPopupManagerState();
    next.firstSeenAt = Date.now();
    await savePopupManagerState(next);
    await clearForcedPopupId();
    return next;
};

export const loadPopupManagerState = async (): Promise<PopupManagerState> => {
    const raw = await AsyncStorage.getItem(POPUP_STORAGE_KEY);
    let nextState = parsePopupManagerState(raw);

    const legacyEntries = await AsyncStorage.multiGet([
        LEGACY_TIMER_KEY,
        LEGACY_HIDE_KEY,
        LEGACY_SNOOZE_KEY,
    ]);
    const legacyMap = Object.fromEntries(legacyEntries);

    let migrated = false;

    const legacyHide = legacyMap[LEGACY_HIDE_KEY];
    if (legacyHide === 'true' && !nextState.popups.whatsapp_group.dismissed) {
        nextState = {
            ...nextState,
            popups: {
                ...nextState.popups,
                whatsapp_group: { ...nextState.popups.whatsapp_group, dismissed: true },
            },
        };
        migrated = true;
    }

    const legacySnoozeRaw = legacyMap[LEGACY_SNOOZE_KEY];
    const legacySnooze = legacySnoozeRaw ? Number(legacySnoozeRaw) : null;
    if (legacySnooze && !Number.isNaN(legacySnooze)) {
        nextState = {
            ...nextState,
            popups: {
                ...nextState.popups,
                whatsapp_group: { ...nextState.popups.whatsapp_group, snoozeUntil: legacySnooze },
            },
        };
        migrated = true;
    }

    const legacyTimerRaw = legacyMap[LEGACY_TIMER_KEY];
    const legacyTimer = legacyTimerRaw ? Number(legacyTimerRaw) : null;
    if (!nextState.firstSeenAt && legacyTimer && !Number.isNaN(legacyTimer)) {
        nextState = { ...nextState, firstSeenAt: legacyTimer };
        migrated = true;
    }

    if (!nextState.firstSeenAt) {
        nextState = { ...nextState, firstSeenAt: Date.now() };
        migrated = true;
    }

    nextState = normalizePopupManagerState(nextState);

    if (!raw || migrated) {
        await savePopupManagerState(nextState);
    }

    if (migrated) {
        await AsyncStorage.multiRemove([LEGACY_TIMER_KEY, LEGACY_HIDE_KEY, LEGACY_SNOOZE_KEY]);
    }

    return nextState;
};

export const getPopupReadyAt = (state: PopupManagerState, now: number, id: PopupId) => {
    const firstSeenAt = state.firstSeenAt ?? now;
    const popupConfig = POPUP_CONFIG[id];
    const baseReadyAt = popupConfig.useInterval === false
        ? firstSeenAt
        : state.lastPopupShownAt
            ? state.lastPopupShownAt + POPUP_INTERVAL_MS
            : firstSeenAt;
    const popupState = state.popups[id];
    const initialReadyAt = firstSeenAt + popupConfig.initialDelayMs;
    const snoozeUntil = popupState?.snoozeUntil ?? 0;

    return Math.max(baseReadyAt, initialReadyAt, snoozeUntil);
};

export const getNextPopupId = (
    state: PopupManagerState,
    now: number,
    isEligible?: (id: PopupId) => boolean,
): PopupId | null => {
    for (const id of POPUP_ORDER) {
        if (state.popups[id]?.dismissed) continue;
        if (isEligible && !isEligible(id)) continue;
        const readyAt = getPopupReadyAt(state, now, id);
        if (now < readyAt) continue;
        return id;
    }

    return null;
};

export const getNextScheduledPopup = (
    state: PopupManagerState,
    now: number,
    isEligible?: (id: PopupId) => boolean,
) => {
    let next: { id: PopupId; readyAt: number } | null = null;

    for (const id of POPUP_ORDER) {
        if (state.popups[id]?.dismissed) continue;
        if (isEligible && !isEligible(id)) continue;
        const readyAt = getPopupReadyAt(state, now, id);
        if (!next || readyAt < next.readyAt) {
            next = { id, readyAt };
        }
    }

    return next;
};

export const getLatestPopupShown = (state: PopupManagerState) => findLatestPopupShown(state.popups);
