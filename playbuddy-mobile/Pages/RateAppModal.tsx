import React, { useEffect, useRef } from 'react';
import * as StoreReview from 'expo-store-review';

import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';

type RateAppModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function RateAppModal({ visible, onDismiss, onSnooze }: RateAppModalProps) {
    const analyticsProps = useAnalyticsProps();
    const hasRequestedRef = useRef(false);

    useEffect(() => {
        if (!visible || hasRequestedRef.current) return;
        hasRequestedRef.current = true;

        const requestReview = async () => {
            let didRequest = false;
            try {
                const isAvailable = await StoreReview.isAvailableAsync();
                if (isAvailable) {
                    didRequest = true;
                    logEvent(UE.RateAppModalOpenStore, analyticsProps);
                    await StoreReview.requestReview();
                }
            } catch {
                // Ignore failures; we'll retry after snooze.
            } finally {
                if (didRequest) {
                    onDismiss();
                } else {
                    onSnooze();
                }
            }
        };

        void requestReview();
    }, [visible, analyticsProps, onDismiss, onSnooze]);

    useEffect(() => {
        if (!visible) {
            hasRequestedRef.current = false;
        }
    }, [visible]);

    return null;
}
