import * as amplitude from '@amplitude/analytics-react-native';
import RNUxcam from 'react-native-ux-cam';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { EventPayloadMap, UE } from '../../userEventTypes';
import type { DeepLink, PromoCode, Event } from '../../commonTypes';

/**
 * Individual builder for DeepLink analytics props
 */
export function getAnalyticsPropsDeepLink(dl: DeepLink) {
    return {
        deep_link_id: String(dl.id),
        deep_link_slug: dl.slug || '',
        deep_link_type: dl.type || '',
        promo_code_id: dl.featured_promo_code?.id?.toString() || '',
        promo_code_code: dl.featured_promo_code?.promo_code || '',
        organizer_id: dl.organizer?.id?.toString() || '',
        organizer_name: dl.organizer?.name || '',
        community_id: dl.community?.id?.toString() || '',
    };
}

/**
 * Individual builder for initial DeepLink analytics props
 */
export function getAnalyticsPropsInitialDeepLink(init: DeepLink) {
    return {
        initial_deep_link_id: String(init.id),
        initial_deep_link_slug: init.slug || '',
        organizer_id: init.organizer?.id?.toString() || '',
        community_id: init.community?.id?.toString() || '',
    };
}

/**
 * Individual builder for Event analytics props
 */
export function getAnalyticsPropsEvent(ev: Event) {
    return {
        event_id: String(ev.id),
        event_name: ev.name || '',
        organizer_id: ev.organizer?.id?.toString() || '',
        organizer_name: ev.organizer?.name || '',
        community_id: ev.communities?.find(c => c.organizer_id?.toString() === ev.organizer?.id?.toString())?.id || '',
        event_url: ev.event_url || '',
    };
}

export function getAnalyticsPropsPromoCode(pc: PromoCode) {
    return {
        promo_code_code: pc.promo_code || '',
        promo_code_id: pc.id?.toString() || '',
        organizer_id: pc.organizer_id?.toString() || '',
    };
}

export function getAnalyticsPropsFeaturedPromoCode(pc: PromoCode) {
    return {
        featured_promo_code: pc.promo_code || '',
        featured_promo_code_id: pc.id?.toString() || '',
    };
}


/**
 * Logs a user event to Amplitude, UXCam, and your backend.
 * Supports passing in analytics props built by the above helpers.
 *
 * @param name  – one of your UE enum members
 * @param props – merged payload shape for this event
 */
export function logEvent<
    E extends UE
>(
    name: E,
    props?: EventPayloadMap[E] extends null ? undefined : EventPayloadMap[E]
): void {
    const safeProps = (props ?? {}) as NonNullable<EventPayloadMap[E]>;

    try {
        amplitude.logEvent(name, safeProps);
    } catch {
        // ignore in dev
    }

    try {
        RNUxcam.logEvent(name, safeProps);
    } catch {
        // ignore in dev
    }

    logUserEventToDB({ user_event_name: name, user_event_props: safeProps });

    console.log('logged event', name, safeProps);
}

// Simple POST to your API
type DBPayload = { user_event_name: string; user_event_props?: Record<string, any> };
const logUserEventToDB = async ({ user_event_name, user_event_props }: DBPayload) => {
    try {
        await axios.post(`${API_BASE_URL}/user_events`, {
            user_event_name,
            user_event_props,
        });
    } catch (error) {
        console.error(`Error recording user event:`, error);
    }
};
