import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { EdgePlayGroupModal } from './EdgePlayGroupModal';
import { NewsletterSignupModal } from './NewsletterSignupModal';
import { RateAppModal } from './RateAppModal';
import { EventPopupModal } from './EventPopupModal';
import { DiscoverGameModal } from './DiscoverGameModal';
import { EventListViewIntroModal } from './Calendar/ListView/EventListViewIntroModal';
import {
    EventListViewMode,
    getEventListIntroSeen,
    getEventListViewMode,
    setEventListIntroSeen,
    setEventListViewMode,
} from './Calendar/ListView/eventListViewMode';
import { useFetchActiveEventPopups } from '../Common/db-axios/useEventPopups';
import type { EventPopup } from '../commonTypes';
import type { EventWithMetadata, NavStack } from '../Common/Nav/NavStackType';
import {
    createEmptyPopupManagerState,
    getForcedPopupId,
    getNextScheduledPopup,
    getNextPopupId,
    getPopupReadyAt,
    loadPopupManagerState,
    normalizePopupManagerState,
    POPUP_CONFIG,
    PopupId,
    PopupManagerState,
    PopupState,
    clearForcedPopupId,
    savePopupManagerState,
} from './popupSchedule';

const EVENT_POPUP_HIDE_KEY_PREFIX = 'event_popup_hide_';
const EVENT_POPUP_FORCE_KEY = 'popup_manager_force_event_popup';
const EVENT_POPUP_SEEN_KEY_PREFIX = 'event_popup_seen_';
const EVENT_POPUP_DELAY_MS = __DEV__ ? 5 * 1000 : 60 * 1000;
const DEBUG_ALWAYS_ENABLE_EVENT_POPUP = __DEV__;
const LIST_VIEW_INTRO_CUTOFF_MS = Date.parse('2026-01-12T00:00:00Z');

const getEventPopupHideKey = (id: string) => `${EVENT_POPUP_HIDE_KEY_PREFIX}${id}`;
const getEventPopupSeenKey = (id: string) => `${EVENT_POPUP_SEEN_KEY_PREFIX}${id}`;

const parseIsoTimestamp = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
};

const getEventPopupEndAt = (popup: EventPopup) => {
    const endAt = parseIsoTimestamp(popup.event?.end_date);
    if (endAt) return endAt;
    return parseIsoTimestamp(popup.event?.start_date);
};

const isEventPopupExpired = (popup: EventPopup, now: number) => {
    const eventEndAt = getEventPopupEndAt(popup);
    if (eventEndAt && eventEndAt <= now) return true;
    const expiresAt = parseIsoTimestamp(popup.expires_at);
    if (expiresAt && expiresAt <= now) return true;
    return false;
};

const isEventPopupEligible = (popup: EventPopup, installAt: number | undefined, now: number) => {
    if (isEventPopupExpired(popup, now)) return false;
    const createdAt = parseIsoTimestamp(popup.created_at);
    if (installAt && createdAt && createdAt > installAt) return false;
    return true;
};

type PopupManagerProps = {
    events?: EventWithMetadata[];
    onListViewModeChange?: (mode: EventListViewMode) => void;
};

export const PopupManager: React.FC<PopupManagerProps> = ({ events, onListViewModeChange }) => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const [state, setState] = useState<PopupManagerState | null>(null);
    const [hasShownThisSession, setHasShownThisSession] = useState(false);
    const [activePopupId, setActivePopupId] = useState<PopupId | null>(null);
    const [activeEventPopup, setActiveEventPopup] = useState<EventPopup | null>(null);
    const [forcedPopupId, setForcedPopupIdState] = useState<PopupId | null>(null);
    const [forcedEventPopup, setForcedEventPopup] = useState<EventPopup | null>(null);
    const [dismissedPopupIds, setDismissedPopupIds] = useState<Record<string, boolean>>({});
    const [dismissedReady, setDismissedReady] = useState(false);
    const eventPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stateRef = useRef<PopupManagerState | null>(null);
    const activePopupIdRef = useRef<PopupId | null>(null);
    const activeEventPopupRef = useRef<EventPopup | null>(null);
    const hasShownThisSessionRef = useRef(false);
    const eventPopupReadyRef = useRef(false);
    const hasPendingEventPopupRef = useRef(false);
    const { data: eventPopups, isLoading: isLoadingEventPopups } = useFetchActiveEventPopups();

    useEffect(() => {
        if (!isFocused) return;
        let mounted = true;

        (async () => {
            const nextState = await loadPopupManagerState();
            const forcedId = await getForcedPopupId();
            const forcedEventRaw = await AsyncStorage.getItem(EVENT_POPUP_FORCE_KEY);
            let forcedEvent: EventPopup | null = null;
            if (forcedEventRaw) {
                try {
                    forcedEvent = JSON.parse(forcedEventRaw) as EventPopup;
                } catch {
                    await AsyncStorage.removeItem(EVENT_POPUP_FORCE_KEY);
                }
            }
            if (mounted) {
                setState(nextState);
                setForcedPopupIdState(forcedId);
                setForcedEventPopup(forcedEvent);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isFocused]);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        activePopupIdRef.current = activePopupId;
    }, [activePopupId]);

    useEffect(() => {
        activeEventPopupRef.current = activeEventPopup;
    }, [activeEventPopup]);

    useEffect(() => {
        if (!activeEventPopup?.id) return;
        void AsyncStorage.setItem(getEventPopupSeenKey(activeEventPopup.id), String(Date.now()));
    }, [activeEventPopup?.id]);

    useEffect(() => {
        hasShownThisSessionRef.current = hasShownThisSession;
    }, [hasShownThisSession]);

    const updateState = (updater: (prev: PopupManagerState) => PopupManagerState) => {
        setState((prev) => {
            const base = normalizePopupManagerState(prev ?? createEmptyPopupManagerState());
            const next = updater(base);
            void savePopupManagerState(next);
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

    const markPopupShown = (id: PopupId, shownAt: number) => {
        updateState((prev) => ({
            ...prev,
            lastPopupShownAt: shownAt,
            popups: {
                ...prev.popups,
                [id]: {
                    ...prev.popups[id],
                    lastShownAt: shownAt,
                },
            },
        }));
    };

    useEffect(() => {
        if (!state) return;
        const listViewPopup = state.popups.list_view_intro;
        const firstSeenAt = state.firstSeenAt ?? Date.now();
        const isLegacyInstall = firstSeenAt < LIST_VIEW_INTRO_CUTOFF_MS;

        if (!listViewPopup?.dismissed && !isLegacyInstall) {
            updatePopupState('list_view_intro', { dismissed: true, snoozeUntil: undefined });
            return;
        }

        if (listViewPopup?.dismissed) return;
        let isActive = true;
        (async () => {
            const [introSeen, listViewMode] = await Promise.all([
                getEventListIntroSeen(),
                getEventListViewMode(),
            ]);
            if (!isActive) return;
            if ((introSeen || listViewMode === 'classic') && !listViewPopup?.dismissed) {
                updatePopupState('list_view_intro', { dismissed: true, snoozeUntil: undefined });
                return;
            }

            if (!listViewPopup?.lastShownAt && !listViewPopup?.snoozeUntil) {
                updatePopupState('list_view_intro', {
                    snoozeUntil: Date.now() + POPUP_CONFIG.list_view_intro.initialDelayMs,
                });
            }
        })();

        return () => {
            isActive = false;
        };
    }, [state]);

    useEffect(() => {
        if (!forcedPopupId) return;
        if (activePopupId || activeEventPopup) return;
        const now = Date.now();

        updateState((prev) => ({
            ...prev,
            lastPopupShownAt: now,
            popups: {
                ...prev.popups,
                [forcedPopupId]: {
                    ...prev.popups[forcedPopupId],
                    dismissed: false,
                    snoozeUntil: undefined,
                    lastShownAt: now,
                },
            },
        }));

        setActivePopupId(forcedPopupId);
        setHasShownThisSession(true);
        void clearForcedPopupId();
        setForcedPopupIdState(null);
    }, [forcedPopupId, activePopupId, activeEventPopup, updateState]);

    useEffect(() => {
        if (!forcedEventPopup) return;
        if (activePopupId || activeEventPopup) return;
        const shownAt = Date.now();

        setActiveEventPopup(forcedEventPopup);
        setHasShownThisSession(true);
        updateState((prev) => ({
            ...prev,
            lastPopupShownAt: Math.max(prev.lastPopupShownAt ?? 0, shownAt),
        }));
        if (forcedEventPopup.id) {
            void AsyncStorage.setItem(getEventPopupSeenKey(forcedEventPopup.id), String(shownAt));
        }
        void AsyncStorage.removeItem(EVENT_POPUP_FORCE_KEY);
        setForcedEventPopup(null);
    }, [forcedEventPopup, activePopupId, activeEventPopup, updateState]);

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
        if (!state) return null;
        const now = Date.now();
        for (const popup of sortedEventPopups) {
            if (dismissedPopupIds[popup.id]) continue;
            if (!isEventPopupEligible(popup, state.firstSeenAt, now)) continue;
            return popup;
        }
        return null;
    }, [dismissedPopupIds, sortedEventPopups, state]);

    const hasPendingEventPopup = eventPopupReady && !!nextEventPopup;

    useEffect(() => {
        eventPopupReadyRef.current = eventPopupReady;
    }, [eventPopupReady]);

    useEffect(() => {
        hasPendingEventPopupRef.current = hasPendingEventPopup;
    }, [hasPendingEventPopup]);

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
            const now = Date.now();
            const currentState = stateRef.current;
            if (!currentState) return;
            if (!isEventPopupEligible(nextEventPopup, currentState.firstSeenAt, now)) return;
            const shownAt = now;
            setActiveEventPopup(nextEventPopup);
            setHasShownThisSession(true);
            updateState((prev) => ({
                ...prev,
                lastPopupShownAt: Math.max(prev.lastPopupShownAt ?? 0, shownAt),
            }));
            if (nextEventPopup?.id) {
                void AsyncStorage.setItem(getEventPopupSeenKey(nextEventPopup.id), String(shownAt));
            }
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
        updateState,
    ]);

    const canShowPopupNow = () => {
        const currentState = stateRef.current;
        if (!currentState) return false;
        if (activePopupIdRef.current || activeEventPopupRef.current) return false;
        if (hasShownThisSessionRef.current) return false;
        if (!eventPopupReadyRef.current || hasPendingEventPopupRef.current) return false;
        return true;
    };

    useEffect(() => {
        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current);
            popupTimerRef.current = null;
        }

        if (!state || activePopupId || hasShownThisSession) return;
        if (!eventPopupReady || hasPendingEventPopup || activeEventPopup) return;

        const now = Date.now();
        const listViewIntroState = state.popups.list_view_intro;
        let showNowId: PopupId | null = null;
        let scheduledId: PopupId | null = null;
        let scheduledAt = 0;

        if (listViewIntroState && !listViewIntroState.dismissed) {
            const readyAt = getPopupReadyAt(state, now, 'list_view_intro');
            if (now >= readyAt) {
                showNowId = 'list_view_intro';
            } else {
                scheduledId = 'list_view_intro';
                scheduledAt = readyAt;
            }
        } else {
            const nextId = getNextPopupId(state, now);
            if (nextId) {
                showNowId = nextId;
            } else {
                const nextScheduled = getNextScheduledPopup(state, now);
                if (nextScheduled) {
                    scheduledId = nextScheduled.id;
                    scheduledAt = nextScheduled.readyAt;
                }
            }
        }

        if (showNowId) {
            setActivePopupId(showNowId);
            setHasShownThisSession(true);
            markPopupShown(showNowId, now);
            return () => undefined;
        }

        if (scheduledId) {
            const delayMs = Math.max(scheduledAt - now, 0);
            if (delayMs > 0) {
                const targetId = scheduledId;
                popupTimerRef.current = setTimeout(() => {
                    popupTimerRef.current = null;
                    if (!canShowPopupNow()) return;
                    const currentState = stateRef.current;
                    if (!currentState) return;
                    if (currentState.popups[targetId]?.dismissed) return;
                    const fireAt = Date.now();
                    setActivePopupId(targetId);
                    setHasShownThisSession(true);
                    markPopupShown(targetId, fireAt);
                }, delayMs);
            }
        }

        return () => {
            if (popupTimerRef.current) {
                clearTimeout(popupTimerRef.current);
                popupTimerRef.current = null;
            }
        };
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
        updatePopupState(id, { snoozeUntil: Date.now() + POPUP_CONFIG[id].snoozeMs });
        setActivePopupId(null);
    };

    const handleListViewIntroChoice = (mode: EventListViewMode) => {
        if (onListViewModeChange) {
            onListViewModeChange(mode);
        } else {
            void setEventListViewMode(mode);
        }
        void setEventListIntroSeen(true);
        dismissPopup('list_view_intro');
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
            <EventListViewIntroModal
                visible={activePopupId === 'list_view_intro'}
                onSwitchToClassic={() => handleListViewIntroChoice('classic')}
                onKeepNew={() => handleListViewIntroChoice('image')}
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
            <DiscoverGameModal
                visible={activePopupId === 'discover_game'}
                onDismiss={() => dismissPopup('discover_game')}
                onSnooze={() => snoozePopup('discover_game')}
            />
        </>
    );
};
