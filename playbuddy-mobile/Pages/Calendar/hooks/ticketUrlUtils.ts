const allowedAffiliates = ['1pb'];

export const buildTicketUrl = (rawUrl: string, opts?: { promoCode?: string }) => {
    const { promoCode } = opts || {};

    // Only attach affiliate for Eventbrite. UTM is safe everywhere.
    const addParams = (u: URL) => {
        const isEventbrite = u.hostname.includes('eventbrite.');
        if (isEventbrite && !allowedAffiliates.includes(u.searchParams.get('aff') || '')) {
            u.searchParams.set('aff', 'playbuddy'); // Eventbrite affiliate
            if (promoCode) u.searchParams.set('discount', promoCode); // EB promo
        } else {
            // Safe defaults for non-EB vendors; won’t break pages
            u.searchParams.set('utm_source', 'playbuddy');
            if (promoCode) u.searchParams.set('discount', promoCode);
        }
    };

    try {
        const u = new URL(rawUrl);
        addParams(u);
        return u.toString();
    } catch {
        // Fallback for relative/invalid URLs
        const sep = rawUrl.includes('?') ? '&' : '?';
        const params = new URLSearchParams();
        // We can’t detect vendor here, so use safe defaults
        params.set('utm_source', 'playbuddy');
        if (promoCode) params.set('discount', promoCode);
        return `${rawUrl}${sep}${params.toString()}`;
    }
};
