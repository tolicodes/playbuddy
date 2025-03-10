import { useUserContext } from "../hooks/UserContext";
import { useCalendarContext } from "../../Calendar/hooks/CalendarContext";
import { Organizer, PromoCode } from "../../../commonTypes";

export const usePromoCode = (): { promoCode: PromoCode, communityId: string, organizer: Organizer } | null => {
    const { deepLinkParams } = useUserContext();
    const { allEvents } = useCalendarContext();
    const communityId = deepLinkParams?.params?.communityId;

    if (!communityId) return null;

    const communityEvents = allEvents.filter(event =>
        event.communities?.some(community => community.id === communityId)
    );

    const organizer = communityEvents.find(event => event.organizer)?.organizer;

    if (!organizer) return null;

    const promoCode = communityEvents.reduce<PromoCode | null>((acc, event) => {
        if (acc) return acc;
        return event.promo_codes?.find(code => code.scope === 'event') ||
            event.organizer?.promo_codes?.find(code => code.scope === 'organizer') ||
            null;
    }, null);

    if (!promoCode) return null;

    return {
        promoCode,
        communityId,
        organizer
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