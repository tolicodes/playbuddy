import { useUserContext } from "../hooks/UserContext";
import { useCalendarContext } from "../../Calendar/hooks/CalendarContext";
import { Organizer, PromoCode } from "../../../commonTypes";

export const usePromoCode = (): { promoCodes: PromoCode[], communityId: string, organizer: Organizer, maxDiscountCode: PromoCode } | null => {
    const { deepLinkParams } = useUserContext();
    const { allEvents } = useCalendarContext();
    const communityId = deepLinkParams?.params?.communityId;

    if (!communityId) return null;

    const communityEvents = allEvents.filter(event =>
        event.communities?.some(community => community.id === communityId)
    );

    if (!communityEvents.length) return null;

    const organizer = communityEvents[0].organizer;

    const promoCodes = [
        ...communityEvents.map(event => event.promo_codes).flat(),
        ...organizer.promo_codes
    ];

    if (!promoCodes.length) return null;

    const maxDiscount = Math.max(...promoCodes.map(code => code.discount));
    const maxDiscountCode = promoCodes.find(code => code.discount === maxDiscount);

    return {
        promoCodes,
        communityId,
        organizer,
        maxDiscountCode: maxDiscountCode!
    };
}

export function addOrReplacePromoCode(url: string, promoCode?: string) {
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