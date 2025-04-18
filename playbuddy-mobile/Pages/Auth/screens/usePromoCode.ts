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