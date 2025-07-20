// PromoCodeCreationForm.tsx
import React, { useState } from 'react';
import { useCreatePromoCode } from '../../common/db-axios/usePromoCodes';

export function CreatePromoCode({ organizerId }: { organizerId: string }) {
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState('');
    const [discountType, setDiscountType] = useState('percent'); // or 'fixed'
    const [scope, setScope] = useState('event'); // or 'event'

    const createPromo = useCreatePromoCode();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!promoCode || !discount || !discountType) return;

        createPromo.mutate({
            promo_code: promoCode,
            discount: parseFloat(discount),
            discount_type: discountType,
            scope,
            organizer_id: Number(organizerId),
        });

        setPromoCode('');
        setDiscount('');
        setDiscountType('percent');
        setScope('event');
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
            <h3>Create Promo Code</h3>

            <div style={{ marginBottom: 10 }}>
                <input
                    placeholder="Promo Code"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    required
                    style={{ padding: 8, width: '100%' }}
                />
            </div>

            <div style={{ marginBottom: 10 }}>
                <input
                    placeholder="Discount (e.g., 10.00)"
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    required
                    style={{ padding: 8, width: '100%' }}
                />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label>
                    Discount Type:{' '}
                    <select
                        value={discountType}
                        onChange={e => setDiscountType(e.target.value)}
                        required
                        style={{ padding: 8 }}
                    >
                        <option value="percent">Percent</option>
                        <option value="fixed">Fixed</option>
                    </select>
                </label>
            </div>

            <div style={{ marginBottom: 10 }}>
                <label>
                    Scope:{' '}
                    <select
                        value={scope}
                        onChange={e => setScope(e.target.value)}
                        style={{ padding: 8 }}
                    >
                        <option value="event">Event</option>
                        <option value="organizer">Organizer</option>
                    </select>
                </label>
            </div>

            <button type="submit">Create Promo Code</button>
        </form>
    );
}
