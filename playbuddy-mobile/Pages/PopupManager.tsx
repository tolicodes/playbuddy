import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EdgePlayGroupModal } from './EdgePlayGroupModal';
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
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../components/styles';
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
const CALENDAR_ADD_COACH_COMPLETED_KEY = 'calendar_add_coach_completed_v1';
const CALENDAR_COACH_INTRO_TOAST_MS = 9000;
const CALENDAR_COACH_SUCCESS_TOAST_MS = 8000;

type CalendarCoachVariant = 'intro' | 'success';

type CalendarCoachContextValue = {
    wobblePlus: boolean;
    notifyWishlistAdded: () => void | Promise<void>;
};

const CalendarCoachContext = createContext<CalendarCoachContextValue | null>(null);

export const useCalendarCoach = () => useContext(CalendarCoachContext);

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

const isEventPopupEligible = (popup: EventPopup, _installAt: number | undefined, now: number) => {
    if (isEventPopupExpired(popup, now)) return false;
    return true;
};

type PopupManagerProps = {
    events?: EventWithMetadata[];
    onListViewModeChange?: (mode: EventListViewMode) => void;
    children?: React.ReactNode;
};

export const PopupManager: React.FC<PopupManagerProps> = ({ events, onListViewModeChange, children }) => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
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
    const [calendarCoachToast, setCalendarCoachToast] = useState<{
        message: string;
        variant: CalendarCoachVariant;
    } | null>(null);
    const calendarCoachAnim = useRef(new Animated.Value(0)).current;
    const calendarCoachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const calendarCoachOnHideRef = useRef<(() => void) | null>(null);
    const calendarCoachIntroSeenRef = useRef(false);
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

    const clearCalendarCoachTimer = useCallback(() => {
        if (calendarCoachTimerRef.current) {
            clearTimeout(calendarCoachTimerRef.current);
            calendarCoachTimerRef.current = null;
        }
    }, []);

    const showCalendarCoachToast = useCallback((
        message: string,
        variant: CalendarCoachVariant,
        options?: { durationMs?: number; onComplete?: () => void },
    ) => {
        setCalendarCoachToast({ message, variant });
        calendarCoachOnHideRef.current = options?.onComplete ?? null;
        clearCalendarCoachTimer();
        const durationMs = options?.durationMs
            ?? (variant === 'intro' ? CALENDAR_COACH_INTRO_TOAST_MS : CALENDAR_COACH_SUCCESS_TOAST_MS);
        calendarCoachTimerRef.current = setTimeout(() => {
            setCalendarCoachToast(null);
            const onComplete = calendarCoachOnHideRef.current;
            calendarCoachOnHideRef.current = null;
            if (onComplete) {
                onComplete();
            }
        }, durationMs);
    }, [clearCalendarCoachTimer]);

    useEffect(() => () => {
        clearCalendarCoachTimer();
    }, [clearCalendarCoachTimer]);

    useEffect(() => {
        if (calendarCoachToast) {
            calendarCoachAnim.setValue(0);
            Animated.spring(calendarCoachAnim, {
                toValue: 1,
                friction: 7,
                tension: 120,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(calendarCoachAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }).start();
        }
    }, [calendarCoachToast, calendarCoachAnim]);

    const updateState = useCallback((updater: (prev: PopupManagerState) => PopupManagerState) => {
        setState((prev) => {
            const base = normalizePopupManagerState(prev ?? createEmptyPopupManagerState());
            const next = updater(base);
            void savePopupManagerState(next);
            return next;
        });
    }, []);

    const updatePopupState = useCallback((id: PopupId, updates: Partial<PopupState>) => {
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
    }, [updateState]);

    const markPopupShown = useCallback((id: PopupId, shownAt: number) => {
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
    }, [updateState]);

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
        if (!activeEventPopup.event_id) return;
        const resolvedEvent = eventLookup.get(Number(activeEventPopup.event_id));
        if (!resolvedEvent) return;
        setActiveEventPopup((prev) => (prev ? { ...prev, event: resolvedEvent } : prev));
    }, [activeEventPopup, eventLookup]);

    const sortedEventPopups = useMemo(() => {
        const items = [...(eventPopups ?? [])].map((popup) => {
            if (popup.event || eventLookup.size === 0 || !popup.event_id) return popup;
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

    const dismissPopup = useCallback((id: PopupId) => {
        updatePopupState(id, { dismissed: true, snoozeUntil: undefined });
        setActivePopupId((prev) => (prev === id ? null : prev));
    }, [updatePopupState]);

    const snoozePopup = useCallback((id: PopupId) => {
        updatePopupState(id, { snoozeUntil: Date.now() + POPUP_CONFIG[id].snoozeMs });
        setActivePopupId((prev) => (prev === id ? null : prev));
    }, [updatePopupState]);

    const handleCalendarCoachWishlistAdded = useCallback(async () => {
        let shouldShowToast = false;
        try {
            const completed = await AsyncStorage.getItem(CALENDAR_ADD_COACH_COMPLETED_KEY);
            if (completed !== 'true') {
                shouldShowToast = true;
                await AsyncStorage.setItem(CALENDAR_ADD_COACH_COMPLETED_KEY, 'true');
            }
        } catch {
            shouldShowToast = true;
        }

        if (shouldShowToast) {
            showCalendarCoachToast(
                'Event added to your calendar.\nLong press to share this event with a friend',
                'success',
            );
        }

        dismissPopup('calendar_add_coach');
    }, [dismissPopup, showCalendarCoachToast]);

    useEffect(() => {
        if (activePopupId !== 'calendar_add_coach') {
            calendarCoachIntroSeenRef.current = false;
            return;
        }
        if (calendarCoachIntroSeenRef.current) return;
        calendarCoachIntroSeenRef.current = true;
        let isActive = true;

        (async () => {
            const completed = await AsyncStorage.getItem(CALENDAR_ADD_COACH_COMPLETED_KEY);
            if (!isActive) return;
            if (completed === 'true') {
                dismissPopup('calendar_add_coach');
                return;
            }
            showCalendarCoachToast('press the save button to add to calendar', 'intro', {
                durationMs: CALENDAR_COACH_INTRO_TOAST_MS,
                onComplete: () => dismissPopup('calendar_add_coach'),
            });
        })();

        return () => {
            isActive = false;
        };
    }, [activePopupId, dismissPopup, showCalendarCoachToast]);

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

    const calendarCoachContextValue = useMemo(() => ({
        wobblePlus: calendarCoachToast?.variant === 'intro',
        notifyWishlistAdded: handleCalendarCoachWishlistAdded,
    }), [calendarCoachToast?.variant, handleCalendarCoachWishlistAdded]);

    const calendarCoachTranslateY = calendarCoachAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });
    const calendarCoachScale = calendarCoachAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
    });
    const calendarCoachBottom = Math.max(insets.bottom + spacing.xxxl, spacing.xxxl);

    return (
        <CalendarCoachContext.Provider value={calendarCoachContextValue}>
            {children}
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
            <DiscoverGameModal
                visible={activePopupId === 'discover_game'}
                onDismiss={() => dismissPopup('discover_game')}
                onSnooze={() => snoozePopup('discover_game')}
            />
            <View
                pointerEvents="none"
                accessibilityElementsHidden={!calendarCoachToast}
                importantForAccessibility={calendarCoachToast ? 'yes' : 'no-hide-descendants'}
                style={[styles.calendarCoachBackdrop, { bottom: calendarCoachBottom }]}
            >
                <Animated.View
                    style={[
                        styles.calendarCoachCard,
                        {
                            opacity: calendarCoachAnim,
                            transform: [{ translateY: calendarCoachTranslateY }, { scale: calendarCoachScale }],
                        },
                    ]}
                >
                    <Text style={styles.calendarCoachText}>{calendarCoachToast?.message ?? ''}</Text>
                </Animated.View>
            </View>
        </CalendarCoachContext.Provider>
    );
};

const styles = StyleSheet.create({
    calendarCoachBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        zIndex: 20,
    },
    calendarCoachCard: {
        maxWidth: 420,
        width: '100%',
        backgroundColor: colors.surfaceWhiteOpaque,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        paddingHorizontal: spacing.lgPlus,
        paddingVertical: spacing.mdPlus,
        ...shadows.card,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 8,
    },
    calendarCoachText: {
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
});
