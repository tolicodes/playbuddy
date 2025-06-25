import { EventWithMetadata } from "../Common/Nav/NavStackType";
import { DeepLink } from "../Common/types/commonTypes";

export const getBestPromoCode = (event: EventWithMetadata, currentDeepLink?: DeepLink | null) => {
    // Determine the promo code to use: initial deep link > event > organizer.
    const eventPromoCode = event.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = event.organizer?.promo_codes?.find(code => code.scope === 'organizer');


    let featuredPromoCode;
    let featuredPromoCodeFromWeeklyPromo;
    if (currentDeepLink) {
        featuredPromoCode = currentDeepLink?.featured_event?.id === event?.id ? currentDeepLink?.featured_promo_code : null;
        featuredPromoCodeFromWeeklyPromo = currentDeepLink?.deep_link_events?.find(event => event.event.id === event.id)?.featured_promo_code;
    }

    const promoCode = featuredPromoCode || featuredPromoCodeFromWeeklyPromo || eventPromoCode || organizerPromoCode;

    return promoCode;
}