import { useUserContext } from "../hooks/UserContext";
import { Organizer, PromoCode, Event, DeepLink } from "../../../commonTypes";

export const usePromoCode = (): {
    featuredPromoCode: PromoCode;
    featuredEvent: Event;
    promoCodes: PromoCode[];
    organizer: Organizer;
    deepLink: DeepLink;
} | null => {
    const { currentDeepLink } = useUserContext();

    if (!currentDeepLink) return null;

    const featuredEvent = currentDeepLink?.featured_event;

    return {
        featuredPromoCode: currentDeepLink.featured_promo_code,
        featuredEvent: featuredEvent,
        promoCodes: currentDeepLink.promo_codes ?? [],
        organizer: currentDeepLink.organizer,
        deepLink: currentDeepLink,
    }
}

export const getEventPromoCodes = (event: Event): PromoCode[] => {
    const { currentDeepLink } = useUserContext();
    // Determine promo code from event or organizer.
    const eventPromoCode = event.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = event.organizer?.promo_codes?.find(code => code.scope === 'organizer');
    const featuredPromoCode = currentDeepLink?.featured_event?.id === event.id ? currentDeepLink?.featured_promo_code : null;
    const promoCode = featuredPromoCode || eventPromoCode || organizerPromoCode;

    return promoCode ? [promoCode] : [];
}
