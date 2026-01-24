import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserContext } from './Auth/hooks/UserContext';
import { EdgePlayGroupModal } from './EdgePlayGroupModal';
import { RateAppModal } from './RateAppModal';
import { EventPopupModal } from './EventPopupModal';
import { DiscoverGameModal } from './DiscoverGameModal';
import { NewsletterSignupModal } from './NewsletterSignupModal';
import { ShareCalendarModal } from './ShareCalendarModal';
import { showNotificationsPromptModal } from './Notifications/NotificationsPromptModal';
import { EventListViewIntroModal } from './Calendar/ListView/EventListViewIntroModal';
import {
    EventListViewMode,
    getEventListIntroSeen,
    getEventListViewMode,
    setEventListIntroSeen,
    setEventListViewMode,
} from './Calendar/ListView/eventListViewMode';
import { useFetchActiveEventPopups } from '../Common/db-axios/useEventPopups';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import type { EventPopup } from '../commonTypes';
import type { EventWithMetadata, NavStack } from '../Common/Nav/NavStackType';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../components/styles';
import { MISC_URLS } from '../config';
import { ensureNotificationPermissions } from '../Common/notifications/organizerPushNotifications';
import {
    createEmptyPopupManagerState,
    getForcedPopupId,
    getPopupReadyAt,
    loadPopupManagerState,
    normalizePopupManagerState,
    POPUP_CONFIG,
    POPUP_ORDER,
    PopupId,
    PopupManagerState,
    PopupState,
    clearForcedPopupId,
    savePopupManagerState,
} from './popupSchedule';

const EVENT_POPUP_HIDE_KEY_PREFIX = 'event_popup_hide_';
const EVENT_POPUP_FORCE_KEY = 'popup_manager_force_event_popup';
const EVENT_POPUP_SEEN_KEY_PREFIX = 'event_popup_seen_';
const APP_INSTALL_FLAG_KEY = 'app_install_flag_v1';
const EVENT_POPUP_DELAY_MS = __DEV__ ? 5 * 1000 : 60 * 1000;
const DEBUG_ALWAYS_ENABLE_EVENT_POPUP = __DEV__;
const LIST_VIEW_INTRO_CUTOFF_MS = Date.parse('2026-01-12T00:00:00Z');
const CALENDAR_ADD_COACH_COMPLETED_KEY = 'calendar_add_coach_completed_v1';
const CALENDAR_COACH_TITLE = 'Add To Calendar';

type CalendarCoachVariant = 'intro' | 'success';

type CalendarCoachContextValue = {
    wobblePlus: boolean;
    showOverlay: boolean;
    notifyWishlistAdded: () => void | Promise<void>;
};

const CalendarCoachContext = createContext<CalendarCoachContextValue | null>(null);

export const useCalendarCoach = () => useContext(CalendarCoachContext);

const getEventPopupHideKey = (id: string) => `${EVENT_POPUP_HIDE_KEY_PREFIX}${id}`;
const getEventPopupSeenKey = (id: string) => `${EVENT_POPUP_SEEN_KEY_PREFIX}${id}`;
const NEWSLETTER_KEYWORD = 'newsletter';
const NEWSLETTER_URL = MISC_URLS.newsletterSignup.toLowerCase();
const isSessionPopup = (id: PopupId) => id === 'list_view_intro' || id === 'calendar_add_coach';

const isNewsletterPopup = (popup: EventPopup) => {
    const haystack = `${popup.title ?? ''}\n${popup.body_markdown ?? ''}`.toLowerCase();
    return haystack.includes(NEWSLETTER_URL) || haystack.includes(NEWSLETTER_KEYWORD);
};

const parseIsoTimestamp = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
};

const getEventPopupShowAt = (popup: EventPopup) =>
    parseIsoTimestamp(popup.published_at) ?? parseIsoTimestamp(popup.created_at);

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

const isEventPopupEligible = (popup: EventPopup, signupAt: number | null, now: number) => {
    if (isEventPopupExpired(popup, now)) return false;
    const showAt = getEventPopupShowAt(popup);
    if (showAt && showAt > now) return false;
    if (signupAt && showAt && showAt <= signupAt) return false;
    return true;
};

type PopupManagerProps = {
    events?: EventWithMetadata[];
    onListViewModeChange?: (mode: EventListViewMode) => void;
    onCalendarCoachIntro?: () => void;
    children?: React.ReactNode;
};

export const PopupManager: React.FC<PopupManagerProps> = ({
    events,
    onListViewModeChange,
    onCalendarCoachIntro,
    children,
}) => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { authUserId, userProfile, session } = useUserContext();
    const analyticsProps = useAnalyticsProps();
    const [hasInstallFlag, setHasInstallFlag] = useState(false);
    const [sessionStartAt, setSessionStartAt] = useState<number | null>(null);
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
    const calendarCoachOnHideRef = useRef<(() => void) | null>(null);
    const calendarCoachIntroSeenRef = useRef(false);
    const { data: eventPopups, isLoading: isLoadingEventPopups } = useFetchActiveEventPopups();

    useEffect(() => {
        if (!isFocused) return;
        let mounted = true;

        (async () => {
            const [
                nextState,
                forcedId,
                forcedEventRaw,
                installFlag,
            ] = await Promise.all([
                loadPopupManagerState(),
                getForcedPopupId(),
                AsyncStorage.getItem(EVENT_POPUP_FORCE_KEY),
                AsyncStorage.getItem(APP_INSTALL_FLAG_KEY),
            ]);
            let forcedEvent: EventPopup | null = null;
            if (forcedEventRaw) {
                try {
                    forcedEvent = JSON.parse(forcedEventRaw) as EventPopup;
                } catch {
                    await AsyncStorage.removeItem(EVENT_POPUP_FORCE_KEY);
                }
            }
            const hasInstall = !!installFlag;
            if (!hasInstall) {
                await AsyncStorage.setItem(APP_INSTALL_FLAG_KEY, 'true');
            }
            const launchAt = Date.now();
            if (mounted) {
                setState(nextState);
                setForcedPopupIdState(forcedId);
                setForcedEventPopup(forcedEvent);
                setHasInstallFlag(hasInstall);
                setSessionStartAt(launchAt);
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

    const showCalendarCoachToast = useCallback((
        message: string,
        variant: CalendarCoachVariant,
        options?: { onComplete?: () => void },
    ) => {
        logEvent(UE.CalendarAddCoachShown, {
            ...analyticsProps,
            variant,
        });
        setCalendarCoachToast({ message, variant });
        calendarCoachOnHideRef.current = options?.onComplete ?? null;
    }, [analyticsProps]);

    const handleCalendarCoachDismiss = useCallback(() => {
        if (calendarCoachToast) {
            logEvent(UE.CalendarAddCoachDismissed, {
                ...analyticsProps,
                variant: calendarCoachToast.variant,
            });
        }
        setCalendarCoachToast(null);
        const onComplete = calendarCoachOnHideRef.current;
        calendarCoachOnHideRef.current = null;
        if (onComplete) {
            onComplete();
        }
    }, [analyticsProps, calendarCoachToast]);

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
        if (!hasInstallFlag) return;
        const launchAt = sessionStartAt ?? Date.now();
        const targetSnoozeUntil = launchAt + POPUP_CONFIG.list_view_intro.initialDelayMs;
        if (!listViewPopup?.lastShownAt && listViewPopup?.snoozeUntil !== targetSnoozeUntil) {
            updatePopupState('list_view_intro', {
                snoozeUntil: targetSnoozeUntil,
            });
        }
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
        })();

        return () => {
            isActive = false;
        };
    }, [state, hasInstallFlag, sessionStartAt, updatePopupState]);

    useEffect(() => {
        if (!state) return;
        const calendarPopup = state.popups.calendar_add_coach;
        if (calendarPopup?.dismissed) return;
        const launchAt = sessionStartAt ?? Date.now();
        const targetSnoozeUntil = launchAt + POPUP_CONFIG.calendar_add_coach.initialDelayMs;
        if (!calendarPopup?.lastShownAt && calendarPopup?.snoozeUntil !== targetSnoozeUntil) {
            updatePopupState('calendar_add_coach', { snoozeUntil: targetSnoozeUntil });
        }
        let isActive = true;

        (async () => {
            const completed = await AsyncStorage.getItem(CALENDAR_ADD_COACH_COMPLETED_KEY);
            if (!isActive) return;
            if (completed === 'true') {
                updatePopupState('calendar_add_coach', { dismissed: true, snoozeUntil: undefined });
                return;
            }
        })();

        return () => {
            isActive = false;
        };
    }, [state, sessionStartAt, updatePopupState]);

    useEffect(() => {
        if (!state) return;
        if (!userProfile || userProfile.joined_newsletter !== true) return;
        const newsletterPopup = state.popups.newsletter_signup;
        if (newsletterPopup?.dismissed) return;
        updatePopupState('newsletter_signup', { dismissed: true, snoozeUntil: undefined });
    }, [state, updatePopupState, userProfile]);

    useEffect(() => {
        if (!state) return;
        if (!userProfile || userProfile.share_calendar !== true) return;
        const shareCalendarPopup = state.popups.share_calendar;
        if (shareCalendarPopup?.dismissed) return;
        updatePopupState('share_calendar', { dismissed: true, snoozeUntil: undefined });
    }, [state, updatePopupState, userProfile]);

    useEffect(() => {
        if (!forcedPopupId || forcedPopupId === 'buddy_list_coach') return;
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
    const canShowNewsletterPopup = !!authUserId && hasInstallFlag;
    const canShowListViewIntro = hasInstallFlag;
    const canShowNewsletterModal = !!authUserId
        && !!userProfile
        && userProfile.joined_newsletter !== true
        && hasInstallFlag;
    const canShowShareCalendarModal = !!authUserId
        && !!userProfile
        && userProfile.share_calendar !== true
        && hasInstallFlag;
    const signupAt = useMemo(() => {
        const profileCreatedAt = (userProfile as { created_at?: string | null } | null)?.created_at ?? null;
        const sessionCreatedAt = session?.user?.created_at ?? null;
        return parseIsoTimestamp(profileCreatedAt) ?? parseIsoTimestamp(sessionCreatedAt) ?? null;
    }, [session, userProfile]);

    const nextEventPopup = useMemo(() => {
        if (!state) return null;
        const now = Date.now();
        for (const popup of sortedEventPopups) {
            if (dismissedPopupIds[popup.id]) continue;
            if (isNewsletterPopup(popup) && !canShowNewsletterPopup) continue;
            if (!isEventPopupEligible(popup, signupAt, now)) continue;
            return popup;
        }
        return null;
    }, [dismissedPopupIds, sortedEventPopups, state, canShowNewsletterPopup, signupAt]);

    const isPopupEligible = useCallback((id: PopupId) => {
        if (id === 'list_view_intro') return canShowListViewIntro;
        if (id === 'newsletter_signup') return canShowNewsletterModal;
        if (id === 'buddy_list_coach') return false;
        if (id === 'share_calendar') return canShowShareCalendarModal;
        if (id === 'notifications_prompt') return false;
        return true;
    }, [canShowListViewIntro, canShowNewsletterModal, canShowShareCalendarModal]);

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
            if (!isEventPopupEligible(nextEventPopup, signupAt, now)) return;
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
        signupAt,
    ]);

    const canShowPopupNow = useCallback((id: PopupId) => {
        const currentState = stateRef.current;
        if (!currentState) return false;
        if (activePopupIdRef.current || activeEventPopupRef.current) return false;
        if (!isSessionPopup(id) && hasShownThisSessionRef.current) return false;
        if (!isSessionPopup(id) && (!eventPopupReadyRef.current || hasPendingEventPopupRef.current)) return false;
        return true;
    }, []);

    useEffect(() => {
        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current);
            popupTimerRef.current = null;
        }

        if (!state || activePopupId || activeEventPopup) return;

        const now = Date.now();
        const getSessionReadyAt = (id: PopupId) => {
            const sessionBase = sessionStartAt ?? now;
            const sessionReadyAt = sessionBase + POPUP_CONFIG[id].initialDelayMs;
            const snoozeUntil = state.popups[id]?.snoozeUntil ?? 0;
            return Math.max(sessionReadyAt, snoozeUntil);
        };

        let showNowId: PopupId | null = null;
        if (!hasShownThisSession) {
            for (const id of POPUP_ORDER) {
                if (isSessionPopup(id)) continue;
                if (state.popups[id]?.dismissed) continue;
                if (!isPopupEligible(id)) continue;
                if (now < getPopupReadyAt(state, now, id)) continue;
                showNowId = id;
                break;
            }
        }

        if (showNowId && canShowPopupNow(showNowId)) {
            setActivePopupId(showNowId);
            setHasShownThisSession(true);
            markPopupShown(showNowId, now);
        }

        let nextSession: { id: PopupId; readyAt: number } | null = null;
        for (const id of POPUP_ORDER) {
            if (!isSessionPopup(id)) continue;
            if (state.popups[id]?.dismissed) continue;
            if (!isPopupEligible(id)) continue;
            const readyAt = getSessionReadyAt(id);
            if (!nextSession || readyAt < nextSession.readyAt) {
                nextSession = { id, readyAt };
            }
        }

        if (nextSession) {
            if (now >= nextSession.readyAt) {
                if (canShowPopupNow(nextSession.id)) {
                    setActivePopupId(nextSession.id);
                    setHasShownThisSession(true);
                    markPopupShown(nextSession.id, now);
                }
            } else {
                const targetId = nextSession.id;
                const delayMs = Math.max(nextSession.readyAt - now, 0);
                popupTimerRef.current = setTimeout(() => {
                    popupTimerRef.current = null;
                    if (!canShowPopupNow(targetId)) return;
                    const currentState = stateRef.current;
                    if (!currentState) return;
                    if (currentState.popups[targetId]?.dismissed) return;
                    if (!isPopupEligible(targetId)) return;
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
        activeEventPopup,
        isPopupEligible,
        sessionStartAt,
    ]);

    const dismissPopup = useCallback((id: PopupId) => {
        updatePopupState(id, { dismissed: true, snoozeUntil: undefined });
        setActivePopupId((prev) => (prev === id ? null : prev));
    }, [updatePopupState]);

    const snoozePopup = useCallback((id: PopupId) => {
        updatePopupState(id, { snoozeUntil: Date.now() + POPUP_CONFIG[id].snoozeMs });
        setActivePopupId((prev) => (prev === id ? null : prev));
    }, [updatePopupState]);

    useEffect(() => {
        if (activePopupId !== 'notifications_prompt') return;
        let isActive = true;

        (async () => {
            const wantsEnable = await showNotificationsPromptModal();
            if (!isActive) return;

            if (!wantsEnable) {
                snoozePopup('notifications_prompt');
                return;
            }

            const granted = await ensureNotificationPermissions();
            if (!isActive) return;
            if (granted) {
                dismissPopup('notifications_prompt');
            } else {
                snoozePopup('notifications_prompt');
            }
        })();

        return () => {
            isActive = false;
        };
    }, [activePopupId, dismissPopup, snoozePopup, ensureNotificationPermissions, showNotificationsPromptModal]);

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
            onCalendarCoachIntro?.();
            showCalendarCoachToast('Press the save button to add to your calendar', 'intro', {
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

    const showCalendarCoachOverlay = calendarCoachToast?.variant === 'intro';
    const calendarCoachContextValue = useMemo(() => ({
        wobblePlus: showCalendarCoachOverlay,
        showOverlay: showCalendarCoachOverlay,
        notifyWishlistAdded: handleCalendarCoachWishlistAdded,
    }), [handleCalendarCoachWishlistAdded, showCalendarCoachOverlay]);

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
            <NewsletterSignupModal
                visible={activePopupId === 'newsletter_signup'}
                onDismiss={() => dismissPopup('newsletter_signup')}
                onSnooze={() => snoozePopup('newsletter_signup')}
            />
            <ShareCalendarModal
                visible={activePopupId === 'share_calendar'}
                onDismiss={() => dismissPopup('share_calendar')}
                onSnooze={() => snoozePopup('share_calendar')}
            />
            <View
                pointerEvents={calendarCoachToast ? 'box-none' : 'none'}
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
                    <View style={styles.calendarCoachHeader}>
                        <View style={styles.calendarCoachIcon}>
                            <FAIcon name="calendar-plus-o" size={12} color={colors.brandInk} />
                        </View>
                        <Text style={styles.calendarCoachTitle}>{CALENDAR_COACH_TITLE}</Text>
                        <TouchableOpacity
                            style={styles.calendarCoachClose}
                            onPress={handleCalendarCoachDismiss}
                            accessibilityLabel="Close add to calendar"
                        >
                            <FAIcon name="times" size={12} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.calendarCoachBody}>
                        <Text style={styles.calendarCoachText}>{calendarCoachToast?.message ?? ''}</Text>
                    </View>
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
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.lg,
        borderWidth: 0,
        paddingHorizontal: spacing.lgPlus,
        paddingVertical: spacing.mdPlus,
        ...shadows.card,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 8,
    },
    calendarCoachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    calendarCoachIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.surfaceLavenderOpaque,
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarCoachTitle: {
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        color: colors.brandInk,
        fontFamily: fontFamilies.body,
    },
    calendarCoachClose: {
        marginLeft: 'auto',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderOpaque,
        borderWidth: 0,
    },
    calendarCoachBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarCoachText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        textAlign: 'left',
        letterSpacing: 0.2,
    },
});
