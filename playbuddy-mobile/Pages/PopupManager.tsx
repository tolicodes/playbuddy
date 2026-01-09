import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { EdgePlayGroupModal } from './EdgePlayGroupModal';
import { NewsletterSignupModal } from './NewsletterSignupModal';
import { RateAppModal } from './RateAppModal';
import { EventPopupModal } from './EventPopupModal';
import { useFetchActiveEventPopups } from '../Common/db-axios/useEventPopups';
import type { EventPopup } from '../commonTypes';
import type { EventWithMetadata, NavStack } from '../Common/Nav/NavStackType';

const STORAGE_KEY = 'popup_manager_state_v1';
const EVENT_POPUP_HIDE_KEY_PREFIX = 'event_popup_hide_';
const LEGACY_TIMER_KEY = 'edgeplay_modal_timer';
const LEGACY_HIDE_KEY = 'edgeplay_modal_hide';
const LEGACY_SNOOZE_KEY = 'edgeplay_modal_snooze';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SNOOZE_MS = 14 * DAY_MS;
const RATE_APP_MIN_DELAY_MS = __DEV__ ? 5 * 1000 : 5 * DAY_MS;
const EVENT_POPUP_DELAY_MS = __DEV__ ? 5 * 1000 : 60 * 1000;
const DEBUG_ALWAYS_ENABLE_EVENT_POPUP = __DEV__;
const POPUP_SETTINGS = {
    whatsapp_group: { minDelayMs: 3 * DAY_MS, snoozeMs: DEFAULT_SNOOZE_MS },
    rate_app: { minDelayMs: RATE_APP_MIN_DELAY_MS, snoozeMs: DEFAULT_SNOOZE_MS },
    newsletter_signup: { minDelayMs: 10 * DAY_MS, snoozeMs: DEFAULT_SNOOZE_MS },
} as const;

type PopupId = keyof typeof POPUP_SETTINGS;

type PopupState = {
    dismissed?: boolean;
    snoozeUntil?: number;
    lastShownAt?: number;
};

type PopupManagerState = {
    firstSeenAt?: number;
    popups: Record<PopupId, PopupState>;
};

const getEventPopupHideKey = (id: string) => `${EVENT_POPUP_HIDE_KEY_PREFIX}${id}`;

const POPUP_ORDER: PopupId[] = ['whatsapp_group', 'rate_app', 'newsletter_signup'];

type PopupManagerProps = {
    events?: EventWithMetadata[];
};

const createEmptyState = (): PopupManagerState => ({
    firstSeenAt: undefined,
    popups: {
        whatsapp_group: {},
        rate_app: {},
        newsletter_signup: {},
    },
});

const normalizeState = (state: PopupManagerState): PopupManagerState => ({
    firstSeenAt: state.firstSeenAt,
    popups: {
        whatsapp_group: state.popups?.whatsapp_group ?? {},
        rate_app: state.popups?.rate_app ?? {},
        newsletter_signup: state.popups?.newsletter_signup ?? {},
    },
});

const parseState = (raw: string | null): PopupManagerState => {
    if (!raw) return createEmptyState();

    try {
        return normalizeState(JSON.parse(raw) as PopupManagerState);
    } catch {
        return createEmptyState();
    }
};

const getNextPopupId = (state: PopupManagerState, now: number): PopupId | null => {
    const firstSeenAt = state.firstSeenAt ?? now;

    for (const id of POPUP_ORDER) {
        const popupState = state.popups[id] ?? {};
        if (popupState.dismissed) continue;
        if (popupState.snoozeUntil && now < popupState.snoozeUntil) continue;
        if (now - firstSeenAt < POPUP_SETTINGS[id].minDelayMs) continue;
        return id;
    }

    return null;
};

export const PopupManager: React.FC<PopupManagerProps> = ({ events }) => {
    const navigation = useNavigation<NavStack>();
    const [state, setState] = useState<PopupManagerState | null>(null);
    const [hasShownThisSession, setHasShownThisSession] = useState(false);
    const [activePopupId, setActivePopupId] = useState<PopupId | null>(null);
    const [activeEventPopup, setActiveEventPopup] = useState<EventPopup | null>(null);
    const [dismissedPopupIds, setDismissedPopupIds] = useState<Record<string, boolean>>({});
    const [dismissedReady, setDismissedReady] = useState(false);
    const eventPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { data: eventPopups, isLoading: isLoadingEventPopups } = useFetchActiveEventPopups();

    useEffect(() => {
        let mounted = true;

        (async () => {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            let nextState = parseState(raw);

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

            nextState = normalizeState(nextState);

            if (!raw || migrated) {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
            }

            if (migrated) {
                await AsyncStorage.multiRemove([LEGACY_TIMER_KEY, LEGACY_HIDE_KEY, LEGACY_SNOOZE_KEY]);
            }

            if (mounted) {
                setState(nextState);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const updateState = (updater: (prev: PopupManagerState) => PopupManagerState) => {
        setState((prev) => {
            const base = normalizeState(prev ?? createEmptyState());
            const next = updater(base);
            void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const updatePopupState = (id: PopupId, updates: Partial<PopupState>) => {
        updateState((prev) => ({
            ...prev,
            popups: {
                ...prev.popups,
                [id]: {
                    ...prev.popups[id],
                    ...updates,
                },
            },
        }));
    };

    const eventLookup = useMemo(() => {
        const map = new Map<number, EventWithMetadata>();
        (events ?? []).forEach((event) => {
            map.set(event.id, event);
        });
        return map;
    }, [events]);

    useEffect(() => {
        if (!activeEventPopup || activeEventPopup.event || eventLookup.size === 0) return;
        const resolvedEvent = eventLookup.get(Number(activeEventPopup.event_id));
        if (!resolvedEvent) return;
        setActiveEventPopup((prev) => (prev ? { ...prev, event: resolvedEvent } : prev));
    }, [activeEventPopup, eventLookup]);

    const sortedEventPopups = useMemo(() => {
        const items = [...(eventPopups ?? [])].map((popup) => {
            if (popup.event || eventLookup.size === 0) return popup;
            const resolvedEvent = eventLookup.get(Number(popup.event_id));
            return resolvedEvent ? { ...popup, event: resolvedEvent } : popup;
        });
        return items.sort((a, b) => {
            const left = a.published_at || a.created_at || '';
            const right = b.published_at || b.created_at || '';
            return right.localeCompare(left);
        });
    }, [eventPopups, eventLookup]);

    useEffect(() => {
        let mounted = true;
        const ids = (eventPopups ?? []).map((popup) => popup.id);
        setDismissedReady(false);
        if (ids.length === 0) {
            setDismissedPopupIds({});
            setDismissedReady(true);
            return;
        }

        AsyncStorage.multiGet(ids.map(getEventPopupHideKey)).then((entries) => {
            if (!mounted) return;
            const next: Record<string, boolean> = {};
            entries.forEach(([key, value]) => {
                if (value === 'true') {
                    const id = key.replace(EVENT_POPUP_HIDE_KEY_PREFIX, '');
                    if (id) next[id] = true;
                }
            });
            setDismissedPopupIds(next);
            setDismissedReady(true);
        });

        return () => {
            mounted = false;
        };
    }, [eventPopups]);

    const eventPopupReady = dismissedReady && !isLoadingEventPopups;

    const nextEventPopup = useMemo(() => {
        const latestPopup = sortedEventPopups[0] ?? null;
        if (!latestPopup) return null;
        if (dismissedPopupIds[latestPopup.id]) return null;
        return latestPopup;
    }, [dismissedPopupIds, sortedEventPopups]);

    const hasPendingEventPopup = eventPopupReady && !!nextEventPopup;

    useEffect(() => {
        if (!eventPopupReady || !nextEventPopup) return;
        if (activeEventPopup || activePopupId) return;
        if (hasShownThisSession && !DEBUG_ALWAYS_ENABLE_EVENT_POPUP) return;

        if (eventPopupTimerRef.current) {
            clearTimeout(eventPopupTimerRef.current);
        }

        eventPopupTimerRef.current = setTimeout(() => {
            eventPopupTimerRef.current = null;
            if (activeEventPopup || activePopupId) return;
            if (hasShownThisSession && !DEBUG_ALWAYS_ENABLE_EVENT_POPUP) return;
            setActiveEventPopup(nextEventPopup);
            setHasShownThisSession(true);
        }, EVENT_POPUP_DELAY_MS);

        return () => {
            if (eventPopupTimerRef.current) {
                clearTimeout(eventPopupTimerRef.current);
                eventPopupTimerRef.current = null;
            }
        };
    }, [
        eventPopupReady,
        nextEventPopup,
        activeEventPopup,
        activePopupId,
        hasShownThisSession,
    ]);

    useEffect(() => {
        if (!state || activePopupId || hasShownThisSession) return;
        if (!eventPopupReady || hasPendingEventPopup || activeEventPopup) return;

        const now = Date.now();
        const nextId = getNextPopupId(state, now);
        if (!nextId) return;

        setActivePopupId(nextId);
        setHasShownThisSession(true);
        updatePopupState(nextId, { lastShownAt: now });
    }, [
        state,
        activePopupId,
        hasShownThisSession,
        eventPopupReady,
        hasPendingEventPopup,
        activeEventPopup,
    ]);

    const dismissPopup = (id: PopupId) => {
        updatePopupState(id, { dismissed: true, snoozeUntil: undefined });
        setActivePopupId(null);
    };

    const snoozePopup = (id: PopupId) => {
        updatePopupState(id, { snoozeUntil: Date.now() + POPUP_SETTINGS[id].snoozeMs });
        setActivePopupId(null);
    };

    const dismissEventPopup = () => {
        if (activeEventPopup?.id) {
            setDismissedPopupIds((prev) => ({ ...prev, [activeEventPopup.id]: true }));
            void AsyncStorage.setItem(getEventPopupHideKey(activeEventPopup.id), 'true');
        }
        setActiveEventPopup(null);
    };

    const handleEventPopupPrimaryAction = () => {
        if (activeEventPopup?.id) {
            setDismissedPopupIds((prev) => ({ ...prev, [activeEventPopup.id]: true }));
            void AsyncStorage.setItem(getEventPopupHideKey(activeEventPopup.id), 'true');
        }
        if (activeEventPopup?.event) {
            navigation.navigate('Event Details', {
                selectedEvent: activeEventPopup.event as EventWithMetadata,
                title: activeEventPopup.event.name,
            });
        }
        setActiveEventPopup(null);
    };

    return (
        <>
            <EventPopupModal
                visible={!!activeEventPopup}
                popup={activeEventPopup}
                onDismiss={dismissEventPopup}
                onPrimaryAction={handleEventPopupPrimaryAction}
            />
            <EdgePlayGroupModal
                visible={activePopupId === 'whatsapp_group'}
                onDismiss={() => dismissPopup('whatsapp_group')}
                onSnooze={() => snoozePopup('whatsapp_group')}
            />
            <RateAppModal
                visible={activePopupId === 'rate_app'}
                onDismiss={() => dismissPopup('rate_app')}
                onSnooze={() => snoozePopup('rate_app')}
            />
            <NewsletterSignupModal
                visible={activePopupId === 'newsletter_signup'}
                onDismiss={() => dismissPopup('newsletter_signup')}
                onSnooze={() => snoozePopup('newsletter_signup')}
            />
        </>
    );
};
