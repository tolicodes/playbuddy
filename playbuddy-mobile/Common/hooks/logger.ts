import * as amplitude from '@amplitude/analytics-react-native';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { EventPayloadMap, UE } from '../../userEventTypes';
import type { DeepLink, PromoCode, Event } from '../../commonTypes';

const normalizeOptionalText = (value: unknown) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

let cachedAuthUserId: string | null = null;

export const setAuthUserIdForLog = (authUserId: string | null) => {
    cachedAuthUserId = normalizeOptionalText(authUserId);
};

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
 * Logs a user event to Amplitude and your backend.
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
    const deviceId = getDeviceIdForLog();
    const safeProps = (props ?? {}) as NonNullable<EventPayloadMap[E]>;
    const baseProps: Record<string, unknown> = { ...safeProps };
    const amplitudeUserId =
        typeof amplitude.getUserId === 'function' ? amplitude.getUserId() : null;
    const resolvedAuthUserId = normalizeOptionalText(baseProps.auth_user_id)
        ?? cachedAuthUserId
        ?? normalizeOptionalText(amplitudeUserId);
    const resolvedDeviceId = normalizeOptionalText(baseProps.device_id) ?? deviceId;

    if (!normalizeOptionalText(baseProps.auth_user_id)) {
        baseProps.auth_user_id = resolvedAuthUserId;
    }
    if (!normalizeOptionalText(baseProps.device_id)) {
        baseProps.device_id = resolvedDeviceId;
    }

    try {
        amplitude.logEvent(name, baseProps);
    } catch {
        // ignore in dev
    }

    logUserEventToDB({
        user_event_name: name,
        user_event_props: baseProps,
        device_id: resolvedDeviceId,
        auth_user_id: resolvedAuthUserId,
    });

    console.log('logged event', name, baseProps);
}

// Simple POST to your API
type DBPayload = {
    user_event_name: string;
    user_event_props?: Record<string, any>;
    device_id?: string | null;
    auth_user_id?: string | null;
};
const logUserEventToDB = async ({
    user_event_name,
    user_event_props,
    device_id,
    auth_user_id,
}: DBPayload) => {
    try {
        await axios.post(`${API_BASE_URL}/user_events`, {
            user_event_name,
            user_event_props,
            device_id,
            auth_user_id,
        });
    } catch (error) {
        console.error(`Error recording user event:`, error);
    }
};

let cachedDeviceId: string | null = null;

const getDeviceIdForLog = () => {
    const amplitudeDeviceId = amplitude.getDeviceId();
    if (typeof amplitudeDeviceId === 'string' && amplitudeDeviceId.trim()) {
        cachedDeviceId = amplitudeDeviceId;
        return amplitudeDeviceId;
    }

    if (cachedDeviceId) return cachedDeviceId;

    const fallback = `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    cachedDeviceId = fallback;
    try {
        amplitude.setDeviceId(fallback);
    } catch {
        // ignore if amplitude isn't ready
    }
    return fallback;
};
