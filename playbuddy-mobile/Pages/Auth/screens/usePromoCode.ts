import { useUserContext } from "../hooks/UserContext";
import { Organizer, PromoCode, Event } from "../../../commonTypes";

export const usePromoCode = (): {
    featuredPromoCode: PromoCode;
    featuredEvent: Event;
    promoCodes: PromoCode[];
    organizer: Organizer;
} | null => {
    const { initialDeepLink } = useUserContext();

    if (!initialDeepLink) return null;

    const featuredEvent = initialDeepLink?.featured_event;

    return {
        featuredPromoCode: initialDeepLink.featured_promo_code,
        featuredEvent: featuredEvent,
        promoCodes: initialDeepLink.promo_codes ?? [],
        organizer: initialDeepLink.organizer,
    }
}

export function addOrReplacePromoCodeToEventbriteUrl(url: string, promoCode?: string) {
    if (!promoCode) return url;

    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('discount', promoCode);
        urlObj.searchParams.set('aff', 'playbuddy');
        return urlObj.toString();
    } catch (error) {
        console.error(`Invalid URL: ${url}, ${error}`);
        return null;
    }
}