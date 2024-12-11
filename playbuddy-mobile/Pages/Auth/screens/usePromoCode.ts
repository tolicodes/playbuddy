import { useUserContext } from "../hooks/UserContext";
import { useCalendarContext } from "../../Calendar/hooks/CalendarContext";
import { Organizer, PromoCode } from "../../../commonTypes";

export const usePromoCode = (): { promoCode: PromoCode, communityId: string, organizer: Organizer } | null => {
    const { deepLinkParams: deepLinkParams } = useUserContext();
    const { allEvents } = useCalendarContext();
    const communityId = deepLinkParams?.params?.communityId;
    const event = allEvents.find(event => event.communities?.some(community => community.id === communityId));
    const promoCode = event?.organizer?.promo_codes?.find(code => code.scope === 'organizer');

    if (!communityId) {
        return null;
    }
    if (!event) {
        throw new Error(`Error parsing promo code deep link: event not found for communityId: ${communityId}.`);
    }
    if (!event.organizer) {
        throw new Error(`Error parsing promo code deep link: organizer not found for event with communityId: ${communityId}.`);
    }
    if (!promoCode) {
        throw new Error(`Error parsing promo code deep link: promo code not found for organizer of event with communityId: ${communityId}.`);
    }

    return {
        promoCode: promoCode,
        communityId: communityId,
        organizer: event.organizer
    };
}

export function addOrReplacePromoCode(url: string, promoCode?: string) {
    if (!promoCode) return url;

    try {
        // Parse the URL
        const urlObj = new URL(url);

        // Set or replace the promo code query parameter
        urlObj.searchParams.set('discount', promoCode);
        urlObj.searchParams.set('aff', 'playbuddy');

        // Return the updated URL
        return urlObj.toString();
    } catch (error) {
        throw new Error(`Invalid URL: ${url}, ${error}`);
    }
}