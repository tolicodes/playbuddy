import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { EdgePlayGroupModal } from './EdgePlayGroupModal';
import { NewsletterSignupModal } from './NewsletterSignupModal';
import { RateAppModal } from './RateAppModal';

const STORAGE_KEY = 'popup_manager_state_v1';
const LEGACY_TIMER_KEY = 'edgeplay_modal_timer';
const LEGACY_HIDE_KEY = 'edgeplay_modal_hide';
const LEGACY_SNOOZE_KEY = 'edgeplay_modal_snooze';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SNOOZE_MS = 14 * DAY_MS;

const POPUP_SETTINGS = {
    whatsapp_group: { minDelayMs: 3 * DAY_MS, snoozeMs: DEFAULT_SNOOZE_MS },
    rate_app: { minDelayMs: 5 * DAY_MS, snoozeMs: DEFAULT_SNOOZE_MS },
    newsletter_signup: { minDelayMs: 7 * DAY_MS, snoozeMs: DEFAULT_SNOOZE_MS },
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

const POPUP_ORDER: PopupId[] = ['whatsapp_group', 'rate_app', 'newsletter_signup'];

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

export const PopupManager: React.FC = () => {
    const [state, setState] = useState<PopupManagerState | null>(null);
    const [activePopupId, setActivePopupId] = useState<PopupId | null>(null);
    const [hasShownThisSession, setHasShownThisSession] = useState(false);

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

    const dismissPopup = (id: PopupId) => {
        updatePopupState(id, { dismissed: true, snoozeUntil: undefined });
        setActivePopupId(null);
    };

    const snoozePopup = (id: PopupId) => {
        updatePopupState(id, { snoozeUntil: Date.now() + POPUP_SETTINGS[id].snoozeMs });
        setActivePopupId(null);
    };

    useEffect(() => {
        if (!state || activePopupId || hasShownThisSession) return;

        const now = Date.now();
        const nextId = getNextPopupId(state, now);
        if (!nextId) return;

        setActivePopupId(nextId);
        setHasShownThisSession(true);
        updatePopupState(nextId, { lastShownAt: now });
    }, [state, activePopupId, hasShownThisSession]);

    return (
        <>
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
