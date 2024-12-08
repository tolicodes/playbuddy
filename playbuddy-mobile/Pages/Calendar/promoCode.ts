export function addOrReplacePromoCode(url: string, promoCode: string) {
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
