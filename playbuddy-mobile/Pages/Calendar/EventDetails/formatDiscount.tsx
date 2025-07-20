import { PromoCode } from '../../../commonTypes';


export const formatDiscount = (promoCode: PromoCode) => {
    if (promoCode.discount_type === 'percent') {
        return `${promoCode.discount}% off`;
    }
    return `$${promoCode.discount} off`;
}
