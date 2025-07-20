// useAnalyticsContext.tsx
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { getBestPromoCode } from '../../utils/getBestPromoCode';
import { EventWithMetadata } from '../Nav/NavStackType';
import { DeepLink } from '../../Common/types/commonTypes';

export const useAnalyticsProps = () => {
    const { authUserId, currentDeepLink } = useUserContext();

    const analyticsProps = {
        auth_user_id: authUserId || null,
        deep_link_id: currentDeepLink?.id || null,
        promo_code_id: currentDeepLink?.featured_promo_code?.id || null,
    };

    return analyticsProps;
};

export const useEventAnalyticsProps = (event?: EventWithMetadata) => {
    const { authUserId, currentDeepLink } = useUserContext();
    const analyticsProps = {
        auth_user_id: authUserId || null,
        deep_link_id: currentDeepLink?.id || null,
    };

    if (!event) return {
        ...analyticsProps,
        event_id: null,
    };

    const eventAnalyticsProps = getEventAnalyticsProps(event, currentDeepLink);

    return {
        ...analyticsProps,
        ...eventAnalyticsProps,
    };
};

export const getEventAnalyticsProps = (event: EventWithMetadata, currentDeepLink?: DeepLink | null) => {
    const promoCode = getBestPromoCode(event, currentDeepLink);

    return {
        event_id: event.id,
        promo_code_id: promoCode?.id || null,
    };
};